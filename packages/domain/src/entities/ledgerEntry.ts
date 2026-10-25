/**
 * LedgerEntry: immutable record of a money event relevant to a lease.
 * Phase 0 = shape + validation; invariants + property tests live in Phase 3.
 */
import { z } from "zod";
import { Id, IsoDateTime, Money } from "@rent/shared";

export const LedgerEntryKind = z.enum([
  "RENT_CHARGE",
  "RENT_PAYMENT",
  "DEPOSIT_HELD",
  "DEPOSIT_RELEASED",
  "LATE_FEE",
  "ADJUSTMENT",
  "REFUND",
]);
export type LedgerEntryKind = z.infer<typeof LedgerEntryKind>;

export const LedgerEntryState = z.enum(["RECORDED", "CONFIRMED", "DISPUTED", "VERIFIED"]);
export type LedgerEntryState = z.infer<typeof LedgerEntryState>;

export const LedgerSource = z.enum(["LANDLORD_RECORD", "SYSTEM", "PSP"]);
export type LedgerSource = z.infer<typeof LedgerSource>;

export const LedgerEntry = z
  .object({
    id: Id,
    leaseId: z.string().min(1),
    kind: LedgerEntryKind,
    state: LedgerEntryState,
    amount: Money,
    recordedBy: z.string().min(1),
    source: LedgerSource,
    /** Linked PSP payment when money actually moved electronically. */
    paymentId: z.string().min(1).nullable(),
    evidenceRef: z.string().min(1).nullable(),
    occurredAt: IsoDateTime,
    createdAt: IsoDateTime,
  })
  .superRefine((e, ctx) => {
    if (e.kind === "RENT_PAYMENT" && e.state === "RECORDED" && e.source === "PSP") {
      ctx.addIssue({
        code: "custom",
        message: "PSP-sourced payments cannot sit in RECORDED state (webhook confirms)",
      });
    }
    if (e.kind === "RENT_PAYMENT" && e.source === "LANDLORD_RECORD") {
      ctx.addIssue({
        code: "custom",
        message: "cash records must use kind RENT_CHARGE state machine, source LANDLORD_RECORD",
      });
    }
  });
export type LedgerEntry = z.infer<typeof LedgerEntry>;
