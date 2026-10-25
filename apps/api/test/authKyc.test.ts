import { describe, expect, it, beforeAll } from "vitest";
import { randomUUID } from "node:crypto";
import { emptyKyc, User } from "@rent/domain";
import { AppendOnlyAuditLog } from "@rent/shared";
import { createApp, type ApiDeps } from "../src/app.js";
import { InMemoryOtpProvider } from "../src/auth/otp.js";
import { MemoryKycRepo, MemoryUserRepo } from "../src/ports/memory.js";
import { signSession } from "../src/auth/jwt.js";

const NOW = "2026-10-25T12:00:00.000Z";
const SECRET = "test-secret-please-rotate-0123456789abcdef";

const users = new MemoryUserRepo();
const kyc = new MemoryKycRepo(users.store);
const audit = new AppendOnlyAuditLog();
const otp = new InMemoryOtpProvider({ exposeCode: true });

function buildApp(): Promise<ReturnType<typeof createApp>> {
  const deps: ApiDeps = {
    dependencies: [],
    userRepo: users,
    kycRepo: kyc,
    audit,
    otp,
    jwtSecret: SECRET,
    now: () => NOW,
  };
  return createApp(deps);
}

let app: Awaited<ReturnType<typeof createApp>>;

beforeAll(async () => {
  app = await buildApp();
});

async function requestOtp(phone: string): Promise<{ requestId: string; devCode: string }> {
  const res = await app.inject({
    method: "POST",
    url: "/auth/otp/request",
    payload: { phone },
  });
  const body = JSON.parse(res.body) as { requestId: string; devCode?: string };
  if (!body.devCode) throw new Error("stub must expose devCode in tests");
  return { requestId: body.requestId, devCode: body.devCode };
}

const uniquePhone = (): string =>
  `+22507${Math.floor(10_000_000 + Math.random() * 89_999_999)}`;

async function signupTenant(phone = uniquePhone(), roles: string[] = ["tenant"]) {
  const { requestId, devCode } = await requestOtp(phone);
  const res = await app.inject({
    method: "POST",
    url: "/auth/otp/verify",
    payload: { phone, requestId, code: devCode, displayName: "Kofi Tenant", roles },
  });
  return {
    res,
    body: JSON.parse(res.body) as { token: string; user: { id: string; isNew: boolean } },
    phone,
  };
}

describe("phone OTP signup + login", () => {
  it("signup creates a user, returns a working JWT, stamps phone-verified", async () => {
    const { body, res } = await signupTenant("+2250700000010");
    expect(res.statusCode).toBe(200);
    expect(body.user.isNew).toBe(true);

    const me = await app.inject({
      method: "GET",
      url: "/me",
      headers: { authorization: `Bearer ${body.token}` },
    });
    const meBody = JSON.parse(me.body) as {
      user: { id: string; displayName: string };
      kyc: { status: string; phoneVerifiedAt: string | null };
      badge: { verified: boolean; scope: string[] };
    };
    expect(me.statusCode).toBe(200);
    expect(meBody.user.displayName).toBe("Kofi Tenant");
    expect(meBody.kyc.status).toBe("UNVERIFIED");
    expect(meBody.kyc.phoneVerifiedAt).toBe(NOW);
    expect(meBody.badge.verified).toBe(false);
    expect(meBody.badge.scope).toEqual([]);
  });

  it("second OTP login reuses the same user (no duplicates)", async () => {
    const phone = "+2250700000011";
    const first = await signupTenant(phone);
    const second = await signupTenant(phone);
    expect(second.body.user.isNew).toBe(false);
    expect(second.body.user.id).toBe(first.body.user.id);

    const logins = await audit.list("User", first.body.user.id);
    expect(logins.filter((e) => e.action === "user.login")).toHaveLength(1);
    expect(logins.filter((e) => e.action === "user.created")).toHaveLength(1);
  });

  it("rejects wrong OTP codes", async () => {
    const phone = uniquePhone();
    const { requestId } = await requestOtp(phone);
    const res = await app.inject({
      method: "POST",
      url: "/auth/otp/verify",
      payload: { phone, requestId, code: "000000", displayName: "Kofi", roles: ["tenant"] },
    });
    expect(res.statusCode).toBe(401);
    expect((JSON.parse(res.body) as { error: string }).error).toBe("invalid_code");
  });

  it("blocks self-selected privileged roles", async () => {
    const { res } = await signupTenant(uniquePhone(), ["admin"]);
    expect(res.statusCode).toBe(403);
    expect((JSON.parse(res.body) as { error: string }).error).toBe("role_not_self_selectable");
  });

  it("rate-limits OTP issuance per phone", async () => {
    const phone = uniquePhone();
    for (let i = 0; i < 5; i++)
      await app.inject({ method: "POST", url: "/auth/otp/request", payload: { phone } });
    const res = await app.inject({
      method: "POST",
      url: "/auth/otp/request",
      payload: { phone },
    });
    expect(res.statusCode).toBe(429);
  });

  it("401s /me without a token", async () => {
    const res = await app.inject({ method: "GET", url: "/me" });
    expect(res.statusCode).toBe(401);
  });
});

describe("KYC submission + admin review", () => {
  let tenantToken: string;
  let tenantId: string;
  let adminToken: string;

  beforeAll(async () => {
    const { body } = await signupTenant("+2250700000012");
    tenantToken = body.token;
    tenantId = body.user.id;

    const adminId = `usr_${randomUUID()}`;
    users.seed(
      User.parse({
        id: adminId,
        phone: "+2250700000099",
        displayName: "Ada Admin",
        roles: ["admin"],
        status: "ACTIVE",
        kyc: { ...emptyKyc(), phoneVerifiedAt: NOW },
        createdAt: NOW,
      }),
    );
    adminToken = await signSession(
      { sub: adminId, phone: "+2250700000099", roles: ["admin"] },
      SECRET,
    );
  });

  it("incomplete T1 is rejected by the rules engine with reasons", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/me/kyc/submissions",
      headers: { authorization: `Bearer ${tenantToken}` },
      payload: { requestedTier: "T1", evidence: {} },
    });
    expect(res.statusCode).toBe(422);
    const body = JSON.parse(res.body) as { error: string; details: { reasons: string[] } };
    expect(body.error).toBe("kyc_submission_invalid");
    expect(body.details.reasons.join(" ")).toContain("ID document");

    const rejected = await audit.list("KycRecord", tenantId);
    expect(rejected.at(-1)?.action).toBe("kyc.submission.rejected");
  });

  it("T1 with ID doc → PENDING_REVIEW and appears in admin queue", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/me/kyc/submissions",
      headers: { authorization: `Bearer ${tenantToken}` },
      payload: { requestedTier: "T1", evidence: { idDocumentRef: "doc://id/123" } },
    });
    expect(res.statusCode).toBe(202);
    expect((JSON.parse(res.body) as { kyc: { status: string } }).kyc.status).toBe(
      "PENDING_REVIEW",
    );

    const queueRes = await app.inject({
      method: "GET",
      url: "/admin/kyc/queue",
      headers: { authorization: `Bearer ${adminToken}` },
    });
    const queueBody = JSON.parse(queueRes.body) as {
      queue: { user: { id: string }; kyc: { pendingTier: string } }[];
    };
    expect(queueRes.statusCode).toBe(200);
    expect(
      queueBody.queue.some((e) => e.user.id === tenantId && e.kyc.pendingTier === "T1"),
    ).toBe(true);
  });

  it("re-submission while pending is rejected", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/me/kyc/submissions",
      headers: { authorization: `Bearer ${tenantToken}` },
      payload: { requestedTier: "T1", evidence: { idDocumentRef: "doc://id/123" } },
    });
    expect(res.statusCode).toBe(422);
  });

  it("admin approval grants the verified badge with date + scope", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/admin/kyc/${tenantId}/decision`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { approve: true, reason: "ID document legible, matches phone identity" },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as {
      kyc: { tier: string; status: string; verifiedAt: string | null };
      badge: { verified: boolean; verifiedAt: string | null; scope: string[] };
    };
    expect(body.kyc.tier).toBe("T1");
    expect(body.kyc.status).toBe("VERIFIED");
    expect(body.kyc.verifiedAt).toBe(NOW);
    expect(body.badge.scope).toEqual(["IDENTITY_PHONE"]);

    const me = await app.inject({
      method: "GET",
      url: "/me",
      headers: { authorization: `Bearer ${tenantToken}` },
    });
    const meBody = JSON.parse(me.body) as {
      badge: { verified: boolean };
      kyc: { tier: string };
    };
    expect(meBody.badge.verified).toBe(true);

    const entries = await audit.list("KycRecord", tenantId);
    expect(entries.some((e) => e.action === "kyc.approved" && e.reason.length > 0)).toBe(true);
  });

  it("T2 is sequential: blocked right after T1 approval without… actually allowed with address proof", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/me/kyc/submissions",
      headers: { authorization: `Bearer ${tenantToken}` },
      payload: { requestedTier: "T2", evidence: { addressProofRef: "doc://addr/7" } },
    });
    expect(res.statusCode).toBe(202);
    expect((JSON.parse(res.body) as { kyc: { pendingTier: string } }).kyc.pendingTier).toBe(
      "T2",
    );
  });

  it("rejects decision without a reason", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/admin/kyc/${tenantId}/decision`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { approve: false, reason: "" },
    });
    expect(res.statusCode).toBe(400);
  });

  it("reject decision puts the record in REJECTED and clears pendingTier", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/admin/kyc/${tenantId}/decision`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { approve: false, reason: "address proof blurry" },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as {
      kyc: { status: string; pendingTier: string | null; tier: string };
    };
    expect(body.kyc.status).toBe("REJECTED");
    expect(body.kyc.pendingTier).toBeNull();
    expect(body.kyc.tier).toBe("T1");
  });
});

describe("role guards", () => {
  it("non-admin cannot access the verification queue", async () => {
    const { body } = await signupTenant("+2250700000014");
    const res = await app.inject({
      method: "GET",
      url: "/admin/kyc/queue",
      headers: { authorization: `Bearer ${body.token}` },
    });
    expect(res.statusCode).toBe(403);
  });
});

describe("OpenAPI", () => {
  it("serves a spec including auth + kyc paths", async () => {
    const res = await app.inject({ method: "GET", url: "/openapi.json" });
    expect(res.statusCode).toBe(200);
    const spec = JSON.parse(res.body) as { paths: Record<string, unknown> };
    expect(Object.keys(spec.paths)).toEqual(
      expect.arrayContaining([
        "/auth/otp/request",
        "/auth/otp/verify",
        "/me",
        "/me/kyc/submissions",
        "/admin/kyc/queue",
        "/admin/kyc/{userId}/decision",
      ]),
    );
  });
});
