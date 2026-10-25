/**
 * KYC tier-transition rules engine. Pure functions: inputs in, decision
 * out. No side effects, no DB — services persist whatever we return.
 * Humans approve; this engine only decides whether an application is
 * complete enough to enter the review queue (§Bot/rules/humans split).
 */
import { z } from "zod";
import { KycRecord, KycTier } from "../entities/user.js";

export type KycTierValue = KycTier;

const TIER_RANK: Record<KycTierValue, number> = { NONE: 0, T1: 1, T2: 2, T3: 3 };

const TIER_ORDER = ["NONE", "T1", "T2", "T3"] as const;

export const tierRank = (tier: KycTierValue): number => TIER_RANK[tier];

export const nextTierUp = (tier: KycTierValue): KycTierValue | null =>
  TIER_ORDER[TIER_RANK[tier] + 1] ?? null;

/** Evidence fields collected for the requested tier (all optional types). */
export const KycEvidence = z
  .object({
    idDocumentRef: z.string().min(1).optional(),
    addressProofRef: z.string().min(1).optional(),
    titleDocRef: z.string().min(1).optional(),
    payoutName: z.string().min(2).max(120).optional(),
  })
  .strict();
export type KycEvidence = z.infer<typeof KycEvidence>;

/** Verified badge scope granted at each tier. */
export const SCOPE_BY_TIER = {
  NONE: [],
  T1: ["IDENTITY_PHONE"],
  T2: ["IDENTITY_PHONE", "ADDRESS"],
  T3: ["IDENTITY_PHONE", "ADDRESS", "OWNERSHIP_PAYOUT"],
} as const satisfies Record<KycTierValue, readonly string[]>;

export const kycBadge = (
  kyc: KycRecord,
): {
  verified: boolean;
  verifiedAt: string | null;
  verifiedBy: string | null;
  tier: KycTierValue;
  scope: readonly string[];
} => ({
  verified: kyc.status === "VERIFIED",
  verifiedAt: kyc.status === "VERIFIED" ? kyc.verifiedAt : null,
  verifiedBy: kyc.status === "VERIFIED" ? kyc.verifiedBy : null,
  tier: kyc.tier,
  scope: kyc.status === "VERIFIED" ? SCOPE_BY_TIER[kyc.tier] : [],
});

export type KycSubmissionResult =
  | { decision: "PENDING_REVIEW"; staged: KycRecord }
  | { decision: "REJECT"; reasons: string[] };

const normalizeName = (name: string): string => name.trim().toLowerCase().replace(/\s+/gu, " ");

export function evaluateKycSubmission(input: {
  current: KycRecord;
  requestedTier: "T1" | "T2" | "T3";
  evidence: KycEvidence;
  /** Registry name the payout account must match; absent = human checks. */
  expectedPayoutName?: string;
}): KycSubmissionResult {
  const { current, requestedTier, evidence } = input;
  const reasons: string[] = [];

  if (current.status === "PENDING_REVIEW") {
    reasons.push("a previous submission is still pending review");
  }
  if (current.status === "VERIFIED" && TIER_RANK[requestedTier] <= TIER_RANK[current.tier]) {
    reasons.push(`tier ${current.tier} is already verified at or above the requested tier`);
  }
  if (TIER_RANK[requestedTier] !== TIER_RANK[current.tier] + 1) {
    reasons.push(
      `KYC tiers are sequential: ${requestedTier} requires tier ${nextTierUp(current.tier)} first`,
    );
  }

  const merged = {
    idDocumentRef: evidence.idDocumentRef ?? current.idDocumentRef,
    addressProofRef: evidence.addressProofRef ?? current.addressProofRef,
    titleDocRef: evidence.titleDocRef ?? current.titleDocRef,
    payoutName: evidence.payoutName ?? current.payoutName,
  };

  switch (requestedTier) {
    case "T1": {
      if (!current.phoneVerifiedAt) reasons.push("phone verification is required before T1");
      if (!merged.idDocumentRef) reasons.push("T1 requires an ID document");
      break;
    }
    case "T2": {
      if (!merged.addressProofRef) reasons.push("T2 requires proof of address");
      if (TIER_RANK[current.tier] < 1) reasons.push("T2 requires a completed T1 first");
      break;
    }
    case "T3": {
      if (!merged.titleDocRef) reasons.push("T3 requires a title/ownership document");
      if (!merged.payoutName) reasons.push("T3 requires a payout account name");
      else if (
        input.expectedPayoutName &&
        normalizeName(merged.payoutName) !== normalizeName(input.expectedPayoutName)
      ) {
        reasons.push("payout name does not match the registered owner name");
      }
      if (TIER_RANK[current.tier] < 2) reasons.push("T3 requires a completed T2 first");
      break;
    }
  }

  if (reasons.length > 0) return { decision: "REJECT", reasons };

  const staged = KycRecord.parse({
    ...current,
    status: "PENDING_REVIEW",
    pendingTier: requestedTier,
    idDocumentRef: merged.idDocumentRef,
    addressProofRef: merged.addressProofRef,
    titleDocRef: merged.titleDocRef,
    payoutName: merged.payoutName,
  });
  return { decision: "PENDING_REVIEW", staged };
}

export function markKycApproved(kyc: KycRecord, adminId: string, now: string): KycRecord {
  return KycRecord.parse({
    ...kyc,
    tier: kyc.pendingTier ?? kyc.tier,
    status: "VERIFIED",
    pendingTier: null,
    verifiedAt: now,
    verifiedBy: adminId,
  });
}

export function markKycRejected(kyc: KycRecord): KycRecord {
  return KycRecord.parse({
    ...kyc,
    status: "REJECTED",
    pendingTier: null,
  });
}
