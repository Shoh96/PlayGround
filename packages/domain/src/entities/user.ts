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
    phoneVerifiedAt: IsoDateTime.nullable(),
    idDocumentRef: z.string().min(1).nullable(),
    addressProofRef: z.string().min(1).nullable(),
    titleDocRef: z.string().min(1).nullable(),
    payoutName: z.string().min(2).nullable(),
    verifiedAt: IsoDateTime.nullable(),
    verifiedBy: z.string().min(1).nullable(),
  })
  .superRefine((rec, ctx) => {
    if (rec.status === "VERIFIED") {
      if (!rec.verifiedAt)
        ctx.addIssue({ code: "custom", message: "VERIFIED requires verifiedAt" });
      if (!rec.verifiedBy)
        ctx.addIssue({ code: "custom", message: "VERIFIED requires verifiedBy" });
    }
    if (rec.phoneVerifiedAt && rec.tier === "NONE") {
      ctx.addIssue({
        code: "custom",
        message: "phoneVerifiedAt implies at least T1",
      });
    }
    const tierRank = { NONE: 0, T1: 1, T2: 2, T3: 3 } as const;
    const rank = tierRank[rec.tier];
    const docRank =
      (rec.idDocumentRef ? 1 : 0) +
      (rec.addressProofRef ? 1 : 0) +
      (rec.titleDocRef && rec.payoutName ? 1 : 0);
    if (docRank > rank) {
      ctx.addIssue({
        code: "custom",
        message: "documents present exceed KYC tier; upgrade tier first",
      });
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
  phoneVerifiedAt: null,
  idDocumentRef: null,
  addressProofRef: null,
  titleDocRef: null,
  payoutName: null,
  verifiedAt: null,
  verifiedBy: null,
});
