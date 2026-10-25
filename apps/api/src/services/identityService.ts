/** Identity service: OTP issuance + signup/login with audit trail. */
import { randomUUID } from "node:crypto";
import { emptyKyc, KycRecord, Role, User, type Actor } from "@rent/domain";
import type { AuditLog } from "@rent/shared";
import { signSession } from "../auth/jwt.js";
import type { OtpProvider } from "../auth/otp.js";
import { AppError } from "../errors/AppError.js";
import type { KycRepo, UserRepo } from "../ports/types.js";

/** Roles a user may self-select at signup. Privileged roles are granted by admins. */
const SELF_SELECTABLE = ["tenant", "landlord", "owner", "manager"] as const;

export interface SignupOutput {
  token: string;
  user: { id: string; phone: string; displayName: string; roles: Role[]; isNew: boolean };
}

export class IdentityService {
  constructor(
    private readonly ports: {
      userRepo: UserRepo;
      kycRepo: KycRepo;
      otp: OtpProvider;
      audit: AuditLog;
      jwtSecret: string;
      now?: () => string;
    },
  ) {}

  async requestOtp(
    phone: string,
  ): Promise<{ requestId: string; expiresAt: string; devCode?: string }> {
    return this.ports.otp.issue(phone);
  }

  async verifyOtpAndSignup(input: {
    phone: string;
    requestId: string;
    code: string;
    displayName?: string;
    roles?: string[];
  }): Promise<SignupOutput> {
    const ok = await this.ports.otp.verify(input.phone, input.requestId, input.code);
    if (!ok) {
      throw new AppError(401, "invalid_code", "OTP invalid, expired or already used");
    }
    const now = this.now();

    const existing = await this.ports.userRepo.byPhone(input.phone);
    if (existing) {
      // each successful OTP login is a fresh phone verification
      const current = (await this.ports.kycRepo.byUser(existing.id)) ?? existing.kyc;
      if (current.phoneVerifiedAt === null) {
        const verifiedKyc = KycRecord.parse({ ...current, phoneVerifiedAt: now });
        await this.ports.kycRepo.upsert(existing.id, verifiedKyc);
        await this.writeAudit(
          existing,
          "kyc.phone_verified",
          verifiedKyc,
          now,
          "phone verified via OTP",
        );
      }
      await this.writeAudit(existing, "user.login", existing, now, "login via phone OTP");
      return {
        token: await signSession(
          { sub: existing.id, phone: existing.phone, roles: [...existing.roles] },
          this.ports.jwtSecret,
        ),
        user: {
          id: existing.id,
          phone: existing.phone,
          displayName: existing.displayName,
          roles: [...existing.roles],
          isNew: false,
        },
      };
    }

    const displayName = (input.displayName ?? "").trim();
    if (displayName.length < 2) {
      throw new AppError(
        422,
        "invalid_display_name",
        "displayName of 2+ chars is required at signup",
      );
    }
    const roles = (input.roles ?? []) as Role[];
    if (roles.length === 0) {
      throw new AppError(422, "role_required", "choose at least one role at signup");
    }
    const notSelfSelectable = roles.filter(
      (r) => !(SELF_SELECTABLE as readonly string[]).includes(r),
    );
    if (notSelfSelectable.length > 0) {
      throw new AppError(
        403,
        "role_not_self_selectable",
        `roles not self-selectable: ${notSelfSelectable.join(", ")}`,
      );
    }
    if (new Set(roles).size !== roles.length) {
      throw new AppError(422, "duplicate_role", "roles must be unique");
    }

    const user = User.parse({
      id: `usr_${randomUUID()}`,
      phone: input.phone,
      displayName,
      roles,
      status: "ACTIVE",
      kyc: KycRecord.parse({ ...emptyKyc(), phoneVerifiedAt: now }),
      createdAt: now,
    });
    const created = await this.ports.userRepo.create(user);
    await this.ports.kycRepo.upsert(created.id, created.kyc);
    await this.writeAudit(created, "user.created", created, now, "signup via phone OTP");

    return {
      token: await signSession(
        { sub: created.id, phone: created.phone, roles: [...created.roles] },
        this.ports.jwtSecret,
      ),
      user: {
        id: created.id,
        phone: created.phone,
        displayName: created.displayName,
        roles: [...created.roles],
        isNew: true,
      },
    };
  }

  private now(): string {
    return (this.ports.now ?? (() => new Date().toISOString()))();
  }

  private actor(id: string, kind: Actor["kind"] = "system"): Actor {
    return { kind, id };
  }

  private async writeAudit(
    subject: { id: string },
    action: string,
    snapshot: unknown,
    at: string,
    reason: string,
    actorKind: Actor["kind"] = "system",
  ): Promise<void> {
    await this.ports.audit.append({
      at: at as never,
      actor: this.actor("api:identity", actorKind),
      action,
      entityType: "User",
      entityId: subject.id,
      before: null,
      after: snapshot,
      reason,
    });
  }
}
