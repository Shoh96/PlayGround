/**
 * User + Role. Phase 0 scope: types + validation only.
 * KYC tiers (T1 phone+ID, T2 +address, T3 +title doc + payout match) are
 * modeled as a field set validated per tier; tier *transitions* are
 * enforced by rules in Phase 1, not here.
 */
import { z } from "zod";
import { Id, IsoDateTime, Phone } from "@rent/shared";

/** Human roles. System/Bot actors are created by workflows, not signup. */
export const Role = z.enum([
  "owner",
  "landlord",
  "manager",
  "tenant",
  "inspector",
  "support",
  "admin",
]);
export type Role = z.infer<typeof Role>;

export const KycTier = z.enum(["NONE", "T1", "T2", "T3"]);
export type KycTier = z.infer<typeof KycTier>;

export const KycStatus = z.enum(["UNVERIFIED", "PENDING_REVIEW", "VERIFIED", "REJECTED"]);
export type KycStatus = z.infer<typeof KycStatus>;

export const KycRecord = z
  .object({
    tier: KycTier,
    status: KycStatus,
    /** Tier requested while awaiting admin review; null unless PENDING_REVIEW. */
    pendingTier: KycTier.nullable(),
    phoneVerifiedAt: IsoDateTime.nullable(),
    idDocumentRef: z.string().min(1).nullable(),
    addressProofRef: z.string().min(1).nullable(),
    titleDocRef: z.string().min(1).nullable(),
    payoutName: z.string().min(2).nullable(),
    verifiedAt: IsoDateTime.nullable(),
    verifiedBy: z.string().min(1).nullable(),
  })
  .superRefine((rec, ctx) => {
    const rank = { NONE: 0, T1: 1, T2: 2, T3: 3 } as const;
    if (rec.status === "VERIFIED") {
      if (!rec.verifiedAt)
        ctx.addIssue({ code: "custom", message: "VERIFIED requires verifiedAt" });
      if (!rec.verifiedBy)
        ctx.addIssue({ code: "custom", message: "VERIFIED requires verifiedBy" });
    }
    if (rec.status === "PENDING_REVIEW") {
      if (!rec.pendingTier) {
        ctx.addIssue({ code: "custom", message: "PENDING_REVIEW requires pendingTier" });
      } else if (rank[rec.pendingTier] !== rank[rec.tier] + 1) {
        ctx.addIssue({
          code: "custom",
          message: "pendingTier must be exactly one tier above the current tier",
        });
      }
    }
    if (rec.pendingTier && rec.status !== "PENDING_REVIEW") {
      ctx.addIssue({
        code: "custom",
        message: "pendingTier is only valid while PENDING_REVIEW",
      });
    }
    if (rec.verifiedAt && !rec.verifiedBy) {
      ctx.addIssue({ code: "custom", message: "verifiedAt without verifiedBy is ambiguous" });
    }
  });
export type KycRecord = z.infer<typeof KycRecord>;

export const UserStatus = z.enum(["PENDING_SIGNUP", "ACTIVE", "SUSPENDED", "DELETED"]);
export type UserStatus = z.infer<typeof UserStatus>;

export const User = z
  .object({
    id: Id,
    phone: Phone,
    displayName: z.string().min(2).max(120),
    roles: z.array(Role).min(1),
    status: UserStatus,
    kyc: KycRecord,
    createdAt: IsoDateTime,
  })
  .superRefine((user, ctx) => {
    if (new Set(user.roles).size !== user.roles.length) {
      ctx.addIssue({ code: "custom", message: "roles must be unique" });
    }
  });
export type User = z.infer<typeof User>;

/** Convenience: build a valid KycRecord without nullable noise. */
export const emptyKyc = (): KycRecord => ({
  tier: "NONE",
  status: "UNVERIFIED",
  pendingTier: null,
  phoneVerifiedAt: null,
  idDocumentRef: null,
  addressProofRef: null,
  titleDocRef: null,
  payoutName: null,
  verifiedAt: null,
  verifiedBy: null,
});
