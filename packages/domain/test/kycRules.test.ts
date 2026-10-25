import { describe, expect, it } from "vitest";
import {
  emptyKyc,
  evaluateKycSubmission,
  kycBadge,
  markKycApproved,
  markKycRejected,
  type KycRecord,
} from "../src/index.js";

const NOW = "2026-10-25T10:00:00Z";

/** Table-driven tier-transition checks: one row per rule in the spec. */
const CASES: {
  name: string;
  current: KycRecord;
  requestedTier: "T1" | "T2" | "T3";
  evidence: Record<string, string>;
  phoneVerified: boolean;
  expectedPayoutName?: string;
  expect: "PENDING_REVIEW" | "REJECT";
  reasonIncludes?: string;
}[] = [
  {
    name: "T1: phone verified + ID doc → pending review",
    current: emptyKyc(),
    requestedTier: "T1",
    evidence: { idDocumentRef: "doc_id_1" },
    phoneVerified: true,
    expect: "PENDING_REVIEW",
  },
  {
    name: "T1: missing ID doc → reject",
    current: emptyKyc(),
    requestedTier: "T1",
    evidence: {},
    phoneVerified: true,
    expect: "REJECT",
    reasonIncludes: "ID document",
  },
  {
    name: "T1: phone unverified → reject",
    current: { ...emptyKyc(), phoneVerifiedAt: null },
    requestedTier: "T1",
    evidence: { idDocumentRef: "doc_id_1" },
    phoneVerified: false,
    expect: "REJECT",
    reasonIncludes: "phone verification",
  },
  {
    name: "T2 from NONE → reject (sequential)",
    current: emptyKyc(),
    requestedTier: "T2",
    evidence: { addressProofRef: "doc_addr_1" },
    phoneVerified: true,
    expect: "REJECT",
    reasonIncludes: "sequential",
  },
  {
    name: "T2 from VERIFIED T1 + address proof → pending review",
    current: {
      ...emptyKyc(),
      tier: "T1",
      status: "VERIFIED",
      phoneVerifiedAt: NOW,
      idDocumentRef: "doc_id_1",
      verifiedAt: NOW,
      verifiedBy: "admin_1",
    },
    requestedTier: "T2",
    evidence: { addressProofRef: "doc_addr_1" },
    phoneVerified: true,
    expect: "PENDING_REVIEW",
  },
  {
    name: "T2: missing address proof → reject",
    current: {
      ...emptyKyc(),
      tier: "T1",
      status: "VERIFIED",
      phoneVerifiedAt: NOW,
      idDocumentRef: "doc_id_1",
      verifiedAt: NOW,
      verifiedBy: "admin_1",
    },
    requestedTier: "T2",
    evidence: {},
    phoneVerified: true,
    expect: "REJECT",
    reasonIncludes: "proof of address",
  },
  {
    name: "T3 from T2 with title + matching payout name → pending review",
    current: {
      ...emptyKyc(),
      tier: "T2",
      status: "VERIFIED",
      phoneVerifiedAt: NOW,
      idDocumentRef: "doc_id_1",
      addressProofRef: "doc_addr_1",
      verifiedAt: NOW,
      verifiedBy: "admin_1",
    },
    requestedTier: "T3",
    evidence: { titleDocRef: "doc_title_1", payoutName: "Awa Koné" },
    phoneVerified: true,
    expectedPayoutName: "Awa Koné ",
    expect: "PENDING_REVIEW",
  },
  {
    name: "T3: payout name mismatch (normalized) → reject",
    current: {
      ...emptyKyc(),
      tier: "T2",
      status: "VERIFIED",
      phoneVerifiedAt: NOW,
      idDocumentRef: "doc_id_1",
      addressProofRef: "doc_addr_1",
      verifiedAt: NOW,
      verifiedBy: "admin_1",
    },
    requestedTier: "T3",
    evidence: { titleDocRef: "doc_title_1", payoutName: "Awa KONE Trading" },
    phoneVerified: true,
    expectedPayoutName: "Awa Koné",
    expect: "REJECT",
    reasonIncludes: "payout name",
  },
  {
    name: "T3: missing title doc → reject",
    current: {
      ...emptyKyc(),
      tier: "T2",
      status: "VERIFIED",
      phoneVerifiedAt: NOW,
      idDocumentRef: "doc_id_1",
      addressProofRef: "doc_addr_1",
      verifiedAt: NOW,
      verifiedBy: "admin_1",
    },
    requestedTier: "T3",
    evidence: { payoutName: "Awa Koné" },
    phoneVerified: true,
    expect: "REJECT",
    reasonIncludes: "title/ownership",
  },
  {
    name: "already PENDING_REVIEW → reject re-submission",
    current: {
      ...emptyKyc(),
      phoneVerifiedAt: NOW,
      idDocumentRef: "doc_id_1",
      status: "PENDING_REVIEW",
      pendingTier: "T1",
    },
    requestedTier: "T1",
    evidence: { idDocumentRef: "doc_id_1" },
    phoneVerified: true,
    expect: "REJECT",
    reasonIncludes: "pending review",
  },
];

describe("evaluateKycSubmission", () => {
  for (const c of CASES) {
    it(c.name, () => {
      const currentModifiers =
        c.phoneVerified === false
          ? { ...c.current, phoneVerifiedAt: null }
          : { ...c.current, phoneVerifiedAt: c.current.phoneVerifiedAt ?? NOW };
      const result = evaluateKycSubmission({
        current: currentModifiers,
        requestedTier: c.requestedTier,
        evidence: c.evidence,
        expectedPayoutName: c.expectedPayoutName,
      });
      if (c.expect === "PENDING_REVIEW") {
        expect(result.decision).toBe("PENDING_REVIEW");
        if (result.decision === "PENDING_REVIEW") {
          expect(result.staged.status).toBe("PENDING_REVIEW");
          expect(result.staged.pendingTier).toBe(c.requestedTier);
        }
      } else {
        expect(result.decision).toBe("REJECT");
        if (c.reasonIncludes) {
          expect(result.decision === "REJECT" && result.reasons.join(" ")).toContain(
            c.reasonIncludes,
          );
        }
      }
    });
  }

  it("rejects exact tier downgrade requests", () => {
    const verified: KycRecord = {
      ...emptyKyc(),
      tier: "T1",
      status: "VERIFIED",
      phoneVerifiedAt: NOW,
      idDocumentRef: "d",
      verifiedAt: NOW,
      verifiedBy: "admin_1",
    };
    const result = evaluateKycSubmission({
      current: verified,
      requestedTier: "T1",
      evidence: {},
    });
    expect(result.decision).toBe("REJECT");
  });
});

describe("decisions and badges", () => {
  it("approval promotes pendingTier and stamps date + admin", () => {
    const staged: KycRecord = {
      ...emptyKyc(),
      phoneVerifiedAt: NOW,
      idDocumentRef: "doc_1",
      status: "PENDING_REVIEW",
      pendingTier: "T1",
    };
    const approved = markKycApproved(staged, "admin_9", NOW);
    expect(approved.tier).toBe("T1");
    expect(approved.status).toBe("VERIFIED");
    expect(approved.verifiedAt).toBe(NOW);
    expect(approved.verifiedBy).toBe("admin_9");
    expect(approved.pendingTier).toBeNull();
  });

  it("rejection keeps previous tier and clears pendingTier", () => {
    const fromVerified: KycRecord = {
      ...emptyKyc(),
      tier: "T2",
      status: "PENDING_REVIEW",
      pendingTier: "T3",
      titleDocRef: "doc_title",
      payoutName: "Awa",
      verifiedAt: NOW,
      verifiedBy: "admin_1",
    };
    const rejected = markKycRejected(fromVerified);
    expect(rejected.status).toBe("REJECTED");
    expect(rejected.pendingTier).toBeNull();
    expect(rejected.tier).toBe("T2");
  });

  it("badge carries date + scope per tier", () => {
    const none = kycBadge(emptyKyc());
    expect(none.verified).toBe(false);
    expect(none.scope).toEqual([]);

    const t2 = kycBadge({
      ...emptyKyc(),
      tier: "T2",
      status: "VERIFIED",
      verifiedAt: NOW,
      verifiedBy: "admin_1",
    });
    expect(t2.verified).toBe(true);
    expect(t2.verifiedAt).toBe(NOW);
    expect(t2.scope).toEqual(["IDENTITY_PHONE", "ADDRESS"]);
  });
});
