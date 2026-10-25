/**
 * Payment intent/attempt. The platform never custodies funds; every PSP
 * movement carries an idempotency key and is webhook-driven.
 */
import { z } from "zod";
import { Id, IsoDateTime, Money } from "@rent/shared";

export const PaymentDirection = z.enum(["COLLECTION", "DISBURSEMENT"]);
export type PaymentDirection = z.infer<typeof PaymentDirection>;

export const PaymentMethod = z.enum([
  "MOBILE_MONEY_MTN",
  "MOBILE_MONEY_ORANGE",
  "CASH",
  "BANK_TRANSFER",
]);
export type PaymentMethod = z.infer<typeof PaymentMethod>;

export const PaymentStatus = z.enum([
  "INITIATED",
  "PROCESSING",
  "SUCCEEDED",
  "FAILED",
  "CANCELLED",
]);
export type PaymentStatus = z.infer<typeof PaymentStatus>;

export const Payment = z
  .object({
    id: Id,
    leaseId: z.string().min(1).nullable(),
    payerUserId: z.string().min(1),
    payeeUserId: z.string().min(1),
    direction: PaymentDirection,
    method: PaymentMethod,
    amount: Money,
    /** PSP-side reference once the provider has accepted the operation. */
    providerRef: z.string().min(1).nullable(),
    idempotencyKey: z.string().min(8),
    status: PaymentStatus,
    failureCode: z.string().min(1).nullable(),
    initiatedAt: IsoDateTime,
    completedAt: IsoDateTime.nullable(),
  })
  .superRefine((p, ctx) => {
    if (p.status === "SUCCEEDED" && (!p.completedAt || !p.providerRef)) {
      ctx.addIssue({
        code: "custom",
        message: "SUCCEEDED payment requires completedAt and providerRef",
      });
    }
    if (p.status === "FAILED" && !p.failureCode) {
      ctx.addIssue({ code: "custom", message: "FAILED payment requires failureCode" });
    }
    if (
      p.status !== "INITIATED" &&
      p.status !== "PROCESSING" &&
      p.completedAt === null &&
      p.failureCode === null
    ) {
      ctx.addIssue({
        code: "custom",
        message: "terminal statuses must carry completedAt or failureCode",
      });
    }
  });
export type Payment = z.infer<typeof Payment>;
