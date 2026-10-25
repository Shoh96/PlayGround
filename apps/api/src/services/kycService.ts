/** KYC service: submission via domain rules, admin queue + decisions, audit Trail. */
import {
  evaluateKycSubmission,
  markKycApproved,
  markKycRejected,
  kycBadge,
  KycEvidence,
  type KycRecord,
  type User,
} from "@rent/domain";
import type { AuditLog } from "@rent/shared";
import { AppError } from "../errors/AppError.js";
import type { KycRepo, UserRepo } from "../ports/types.js";

export type KycSubmissionOutcome = {
  status: "PENDING_REVIEW";
  kyc: KycRecord;
  badge: ReturnType<typeof kycBadge>;
};

export class KycService {
  constructor(
    private readonly ports: {
      userRepo: UserRepo;
      kycRepo: KycRepo;
      audit: AuditLog;
      now?: () => string;
    },
  ) {}

  private now(): string {
    return (this.ports.now ?? (() => new Date().toISOString()))();
  }

  private sysActor(id: string): { kind: "system" | "admin"; id: string } {
    if (id === "api:kyc") return { kind: "system", id };
    return { kind: "admin", id };
  }

  /** GET /me payload: kyc + verified badge (date + scope). */
  async me(
    userId: string,
  ): Promise<{ user: User; kyc: KycRecord; badge: ReturnType<typeof kycBadge> } | null> {
    const user = await this.ports.userRepo.byId(userId);
    if (!user) return null;
    const kyc = (await this.ports.kycRepo.byUser(userId)) ?? user.kyc;
    return { user, kyc, badge: kycBadge(kyc) };
  }

  async submit(
    userId: string,
    input: {
      requestedTier: "T1" | "T2" | "T3";
      evidence: unknown;
      expectedPayoutName?: string;
    },
  ): Promise<KycSubmissionOutcome> {
    const now = this.now();
    const user = await this.ports.userRepo.byId(userId);
    if (!user) throw new AppError(404, "user_not_found", "user id unknown");

    const evidence = KycEvidence.parse(input.evidence);
    const current = (await this.ports.kycRepo.byUser(userId)) ?? user.kyc;

    const result = evaluateKycSubmission({
      current,
      requestedTier: input.requestedTier,
      evidence,
      expectedPayoutName: input.expectedPayoutName,
      // provider registry match is optional; absent → reviewer confirms (human judges)
    });

    if (result.decision === "REJECT") {
      await this.ports.audit.append({
        at: now,
        actor: this.sysActor("api:kyc") as never,
        action: "kyc.submission.rejected",
        entityType: "KycRecord",
        entityId: userId,
        before: current,
        after: current,
        reason: result.reasons.join("; "),
      });
      throw new AppError(
        422,
        "kyc_submission_invalid",
        "KYC submission rejected by rules engine",
        {
          reasons: result.reasons,
        },
      );
    }

    await this.ports.kycRepo.upsert(userId, result.staged);
    await this.ports.audit.append({
      at: now,
      actor: this.sysActor("api:kyc") as never,
      action: "kyc.submitted",
      entityType: "KycRecord",
      entityId: userId,
      before: current,
      after: result.staged,
      reason: `tier ${input.requestedTier} evidence submitted`,
    });
    return { status: "PENDING_REVIEW", kyc: result.staged, badge: kycBadge(result.staged) };
  }

  async queue(): Promise<{ user: User; kyc: KycRecord }[]> {
    // join users for display info
    const entries = await this.ports.kycRepo.listPendingReview();
    return entries;
  }

  async decide(
    adminUserId: string,
    targetUserId: string,
    input: {
      approve: boolean;
      reason: string;
    },
  ): Promise<{ kyc: KycRecord; badge: ReturnType<typeof kycBadge> }> {
    const now = this.now();
    const target = await this.ports.userRepo.byId(targetUserId);
    if (!target) throw new AppError(404, "user_not_found", "user id unknown");
    const kyc = await this.ports.kycRepo.byUser(targetUserId);
    if (!kyc || kyc.status !== "PENDING_REVIEW") {
      throw new AppError(
        409,
        "not_pending_review",
        "no KYC submission pending review for this user",
      );
    }
    if (input.reason.trim().length < 3) {
      throw new AppError(422, "reason_required", "a decision reason of 3+ chars is required");
    }

    const updated = input.approve
      ? markKycApproved(kyc, adminUserId, now)
      : markKycRejected(kyc);
    await this.ports.kycRepo.upsert(targetUserId, updated);
    await this.ports.audit.append({
      at: now,
      actor: this.sysActor(adminUserId) as never,
      action: input.approve ? "kyc.approved" : "kyc.rejected",
      entityType: "KycRecord",
      entityId: targetUserId,
      before: kyc,
      after: updated,
      reason: input.reason,
    });
    return { kyc: updated, badge: kycBadge(updated) };
  }
}
