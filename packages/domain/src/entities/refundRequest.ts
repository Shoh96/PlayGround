/**
 * RefundRequest: intent + policy-versioned calculation + execution status.
 * The rules engine (Phase 5) computes decisions; this entity only carries
 * validated state. No automated approval happens in the entity layer.
 */
import { z } from "zod";
import { Id, IsoDateTime, Money } from "@rent/shared";

export const RefundReason = z.enum([
  "CANCELLED_BEFORE_MOVE_IN",
  "PROPERTY_NOT_AS_DESCRIBED",
  "DUPLICATE_PAYMENT",
  "OWNER_INITIATED",
  "OTHER",
]);
export type RefundReason = z.infer<typeof RefundReason>;

export const RefundStatus = z.enum([
  "REQUESTED",
  "AUTO_APPROVED",
  "IN_REVIEW",
  "APPROVED",
  "REJECTED",
  "EXECUTING",
  "EXECUTED",
  "FAILED",
  "ESCALATED",
]);
export type RefundStatus = z.infer<typeof RefundStatus>;

export const RefundCalcItem = z.object({
  label: z.string().min(1).max(80),
  amount: Money,
  source: z.enum(["POLICY", "MANUAL"]),
});
export type RefundCalcItem = z.infer<typeof RefundCalcItem>;

export const RefundRequest = z
  .object({
    id: Id,
    leaseId: z.string().min(1).nullable(),
    /** Booking reference arrives with Phase 5; kept nullable until then. */
    bookingId: z.string().min(1).nullable(),
    requestedBy: z.string().min(1),
    reason: RefundReason,
    policyVersion: z.string().min(1).nullable(),
    requestedAmount: Money,
    calculation: z.array(RefundCalcItem).nullable(),
    status: RefundStatus,
    /** PSP payment created to execute the refund. */
    refundPaymentId: z.string().min(1).nullable(),
    initiatedAt: IsoDateTime,
    decidedAt: IsoDateTime.nullable(),
    executedAt: IsoDateTime.nullable(),
    failureCode: z.string().min(1).nullable(),
  })
  .superRefine((r, ctx) => {
    if (!r.leaseId && !r.bookingId) {
      ctx.addIssue({
        code: "custom",
        message: "refund must reference a lease or a booking",
      });
    }
    if (["APPROVED", "EXECUTING", "EXECUTED"].includes(r.status) && !r.decidedAt) {
      ctx.addIssue({ code: "custom", message: `${r.status} requires decidedAt` });
    }
    if (r.status === "EXECUTED" && !r.executedAt) {
      ctx.addIssue({ code: "custom", message: "EXECUTED requires executedAt" });
    }
  });
export type RefundRequest = z.infer<typeof RefundRequest>;
