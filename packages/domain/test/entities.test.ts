import { describe, expect, it } from "vitest";
import {
  AuditLogEntry,
  Dispute,
  emptyKyc,
  LedgerEntry,
  Lease,
  Listing,
  money,
  Payment,
  Property,
  RefundRequest,
  User,
} from "../src/index.js";
import { AppendOnlyAuditLog } from "@rent/shared";

const NOW = "2026-10-25T10:00:00Z" as const;

const validOperator = () => ({
  id: "u_ops",
  phone: "+2250700000001" as const,
  displayName: "Awa Test",
  roles: ["landlord" as const],
  status: "ACTIVE" as const,
  kyc: { ...emptyKyc() },
  createdAt: NOW,
});

describe("User", () => {
  it("accepts a minimal tenant with NO kyc", () => {
    const parsed = User.safeParse({ ...validOperator(), roles: ["tenant"] });
    expect(parsed.success).toBe(true);
  });

  it("rejects duplicate roles", () => {
    const parsed = User.safeParse({
      ...validOperator(),
      roles: ["tenant", "tenant"],
    });
    expect(parsed.success).toBe(false);
  });

  it("allows docs staged ahead of tier only while PENDING_REVIEW", () => {
    const staged = User.safeParse({
      ...validOperator(),
      kyc: {
        ...emptyKyc(),
        phoneVerifiedAt: NOW,
        idDocumentRef: "doc_123",
        status: "PENDING_REVIEW",
        pendingTier: "T1",
      },
    });
    expect(staged.success).toBe(true);

    const loose = User.safeParse({
      ...validOperator(),
      kyc: { ...emptyKyc(), idDocumentRef: "doc_123" },
    });
    expect(loose.success).toBe(true);
  });

  it("rejects PENDING_REVIEW without pendingTier", () => {
    const parsed = User.safeParse({
      ...validOperator(),
      kyc: { ...emptyKyc(), status: "PENDING_REVIEW" },
    });
    expect(parsed.success).toBe(false);
  });
});

describe("Property", () => {
  it("validates a full property", () => {
    const property = Property.safeParse({
      id: "p_1",
      ownerUserId: "u_owner",
      managerUserId: null,
      title: "2-bed flat in Cocody",
      kind: "APARTMENT",
      address: {
        line1: "Rue des Jardins 12",
        city: "Abidjan",
        region: "Abidjan",
        country: "CI",
        location: { lat: 5.35, lng: -3.99 },
      },
      ownershipDocRef: "doc_title_1",
      status: "PENDING_VERIFICATION",
      createdAt: NOW,
      updatedAt: NOW,
    });
    expect(property.success).toBe(true);
  });

  it("rejects bad country code", () => {
    const property = Property.safeParse({
      id: "p_1",
      ownerUserId: "u_owner",
      managerUserId: null,
      title: "2-bed flat in Cocody",
      kind: "APARTMENT",
      address: {
        line1: "Rue des Jardins 12",
        city: "Abidjan",
        region: "Abidjan",
        country: "III",
      },
      ownershipDocRef: null,
      status: "PENDING_VERIFICATION",
      createdAt: NOW,
      updatedAt: NOW,
    });
    expect(property.success).toBe(false);
  });
});

describe("Listing", () => {
  const base = {
    id: "l_1",
    propertyId: "p_1",
    landlordUserId: "u_landlord",
    rent: money(120000),
    deposit: money(120000),
    minLeaseMonths: 12,
    verifiedByInspectionId: null,
    publishedAt: null,
    createdAt: NOW,
    updatedAt: NOW,
  };

  it("rejects VERIFIED without inspection", () => {
    const parsed = Listing.safeParse({ ...base, status: "VERIFIED" });
    expect(parsed.success).toBe(false);
  });

  it("accepts VERIFIED with inspection ref", () => {
    const parsed = Listing.safeParse({
      ...base,
      status: "VERIFIED",
      verifiedByInspectionId: "insp_1",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects LIVE without publishedAt", () => {
    const parsed = Listing.safeParse({ ...base, status: "LIVE" });
    expect(parsed.success).toBe(false);
  });
});

describe("Lease", () => {
  const base = {
    id: "lease_1",
    listingId: "l_1",
    propertyId: "p_1",
    landlordUserId: "u_landlord",
    tenantUserId: "u_tenant",
    rent: money(120000),
    deposit: money(120000),
    startDate: "2026-11-01T00:00:00Z",
    endDate: "2027-10-31T00:00:00Z",
    rentDueDay: 5,
    policyVersion: "cancellation-v1",
    acceptedAt: NOW,
    status: "ACTIVE",
    createdAt: NOW,
    updatedAt: NOW,
  };

  it("accepts an active lease", () => {
    expect(Lease.safeParse(base).success).toBe(true);
  });

  it("rejects endDate before startDate", () => {
    const parsed = Lease.safeParse({ ...base, endDate: "2026-10-01T00:00:00Z" });
    expect(parsed.success).toBe(false);
  });

  it("requires acceptedAt for non-pending leases", () => {
    const parsed = Lease.safeParse({ ...base, acceptedAt: null });
    expect(parsed.success).toBe(false);
  });
});

describe("Payment", () => {
  const base = {
    id: "pay_1",
    leaseId: "lease_1",
    payerUserId: "u_tenant",
    payeeUserId: "u_landlord",
    direction: "COLLECTION",
    method: "MOBILE_MONEY_MTN",
    amount: money(120000),
    providerRef: "mtn_txn_88",
    idempotencyKey: "key-pay-0001",
    status: "SUCCEEDED",
    failureCode: null,
    initiatedAt: NOW,
    completedAt: NOW,
  };

  it("accepts succeeded PSP payment", () => {
    expect(Payment.safeParse(base).success).toBe(true);
  });

  it("rejects SUCCEEDED without providerRef", () => {
    const parsed = Payment.safeParse({ ...base, providerRef: null });
    expect(parsed.success).toBe(false);
  });

  it("rejects FAILED without failureCode", () => {
    const parsed = Payment.safeParse({ ...base, status: "FAILED", completedAt: null });
    expect(parsed.success).toBe(false);
  });
});

describe("LedgerEntry", () => {
  const base = {
    id: "le_1",
    leaseId: "lease_1",
    kind: "RENT_PAYMENT",
    state: "CONFIRMED",
    amount: money(120000),
    recordedBy: "u_landlord",
    source: "PSP",
    paymentId: "pay_1",
    evidenceRef: null,
    occurredAt: NOW,
    createdAt: NOW,
  };

  it("accepts a confirmed PSP rent payment", () => {
    expect(LedgerEntry.safeParse(base).success).toBe(true);
  });

  it("rejects PSP-sourced payment stuck in RECORDED", () => {
    const parsed = LedgerEntry.safeParse({ ...base, state: "RECORDED" });
    expect(parsed.success).toBe(false);
  });

  it("rejects landlord-recorded RENT_PAYMENT kind", () => {
    const parsed = LedgerEntry.safeParse({
      ...base,
      source: "LANDLORD_RECORD",
    });
    expect(parsed.success).toBe(false);
  });
});

describe("RefundRequest", () => {
  const base = {
    id: "rr_1",
    leaseId: "lease_1",
    bookingId: null,
    requestedBy: "u_tenant",
    reason: "CANCELLED_BEFORE_MOVE_IN",
    policyVersion: "cancellation-v1",
    requestedAmount: money(60000),
    calculation: [{ label: "unused days", amount: money(60000), source: "POLICY" as const }],
    status: "APPROVED",
    refundPaymentId: null,
    initiatedAt: NOW,
    decidedAt: NOW,
    executedAt: null,
    failureCode: null,
  };

  it("accepts approved refund with calculation", () => {
    expect(RefundRequest.safeParse(base).success).toBe(true);
  });

  it("requires either leaseId or bookingId", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { leaseId, ...orphan } = base;
    const parsed = RefundRequest.safeParse(orphan);
    expect(parsed.success).toBe(false);
  });

  it("requires decidedAt for APPROVED", () => {
    const parsed = RefundRequest.safeParse({ ...base, decidedAt: null });
    expect(parsed.success).toBe(false);
  });
});

describe("Dispute", () => {
  it("accepts a dispute in evidence window", () => {
    const parsed = Dispute.safeParse({
      id: "d_1",
      kind: "RENT_RECORD",
      status: "EVIDENCE_WINDOW",
      subject: { entityType: "LedgerEntry", entityId: "le_1" },
      openedBy: "u_tenant",
      assignedTo: null,
      evidenceDeadline: "2026-11-01T00:00:00Z",
      decision: null,
      decisionReason: null,
      decidedAt: null,
      appealDeadline: null,
      createdAt: NOW,
      closedAt: null,
    });
    expect(parsed.success).toBe(true);
  });

  it("requires closedAt for CLOSED", () => {
    const parsed = Dispute.safeParse({
      id: "d_1",
      kind: "OTHER",
      status: "CLOSED",
      subject: { entityType: "Lease", entityId: "lease_1" },
      openedBy: "u_tenant",
      assignedTo: "u_support",
      evidenceDeadline: NOW,
      decision: "refund half",
      decisionReason: "policy 3.2",
      decidedAt: NOW,
      appealDeadline: null,
      createdAt: NOW,
      closedAt: null,
    });
    expect(parsed.success).toBe(false);
  });
});

describe("AuditLogEntry", () => {
  it("validates entries produced by the shared append-only log", async () => {
    const log = new AppendOnlyAuditLog();
    const entry = await log.append({
      at: NOW,
      actor: { kind: "landlord", id: "u_landlord" },
      action: "lease.created",
      entityType: "Lease",
      entityId: "lease_1",
      before: null,
      after: { status: "PENDING_SIGNATURE" },
      reason: "lease created from booking",
      traceId: "tr-abc-123",
    });
    expect(AuditLogEntry.safeParse(entry).success).toBe(true);
  });

  it("rejects malformed action names", async () => {
    const parsed = AuditLogEntry.safeParse({
      seq: 1,
      at: NOW,
      actor: { kind: "system", id: "sys" },
      action: "created_lease",
      entityType: "Lease",
      entityId: "lease_1",
      before: null,
      after: {},
      reason: "x",
    });
    expect(parsed.success).toBe(false);
  });
});
