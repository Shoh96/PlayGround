import { describe, expect, it, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { emptyKyc, KycRecord, User } from "@rent/domain";
import { createDb } from "../src/db/db.js";
import { PostgresAuditLog } from "../src/db/auditLog.js";
import { DrizzleKycRepo, DrizzleUserRepo } from "../src/db/userKycRepo.js";

const url = process.env.DATABASE_URL;

describe.skipIf(!url)("drizzle adapters (integration)", () => {
  const { sql, db } = createDb(url!);
  const userRepo = new DrizzleUserRepo(db);
  const kycRepo = new DrizzleKycRepo(db, userRepo);
  const audit = new PostgresAuditLog(db);

  const NOW = new Date().toISOString();
  const userId = `usr_${randomUUID()}`;
  const phone = `+22509${Math.floor(10_000_000 + Math.random() * 89_999_999)}`;
  const staged = KycRecord.parse({
    ...emptyKyc(),
    phoneVerifiedAt: NOW,
    idDocumentRef: "doc://t/1",
    status: "PENDING_REVIEW",
    pendingTier: "T1",
  });

  afterAll(async () => {
    await sql`DELETE FROM kyc_records WHERE user_id = ${userId}`;
    await sql`DELETE FROM audit_log WHERE entity_id = ${userId}`;
    await sql`DELETE FROM users WHERE id = ${userId}`;
    await sql.end({ timeout: 5 });
  });

  it("roundtrips a user + kyc + audit entry", async () => {
    const created = await userRepo.create(
      User.parse({
        id: userId,
        phone,
        displayName: "Inte Gration",
        roles: ["tenant"],
        status: "ACTIVE",
        kyc: KycRecord.parse({ ...emptyKyc(), phoneVerifiedAt: NOW }),
        createdAt: NOW,
      }),
    );
    expect(created.id).toBe(userId);

    const fetched = await userRepo.byId(userId);
    expect(fetched?.phone).toBe(phone);
    expect(fetched?.kyc.tier).toBe("NONE");

    await kycRepo.upsert(userId, staged);
    const reread = await kycRepo.byUser(userId);
    expect(reread?.status).toBe("PENDING_REVIEW");
    expect(reread?.pendingTier).toBe("T1");

    const queue = await kycRepo.listPendingReview();
    expect(queue.some((e) => e.user.id === userId)).toBe(true);

    await audit.append({
      at: NOW,
      actor: { kind: "system", id: "api:kyc" },
      action: "kyc.submitted",
      entityType: "KycRecord",
      entityId: userId,
      before: null,
      after: staged,
      reason: "integration test",
    });
    const entries = await audit.list("KycRecord", userId);
    expect(entries.some((e) => e.action === "kyc.submitted")).toBe(true);
    expect((await userRepo.byPhone(phone))?.id).toBe(userId);
  });
});
