/** Dispute lifecycle: OPEN → EVIDENCE_WINDOW → ADJUDICATION → DECIDED → (APPEALED) → CLOSED. */
import { z } from "zod";
import { Id, IsoDateTime } from "@rent/shared";

export const DisputeKind = z.enum([
  "REFUND",
  "RENT_RECORD",
  "PROPERTY_CONDITION",
  "LEASE_TERMS",
  "OTHER",
]);
export type DisputeKind = z.infer<typeof DisputeKind>;

export const DisputeStatus = z.enum([
  "OPEN",
  "EVIDENCE_WINDOW",
  "ADJUDICATION",
  "DECIDED",
  "APPEALED",
  "CLOSED",
]);
export type DisputeStatus = z.infer<typeof DisputeStatus>;

export const Dispute = z
  .object({
    id: Id,
    kind: DisputeKind,
    status: DisputeStatus,
    subject: z.object({
      entityType: z.string().min(1),
      entityId: z.string().min(1),
    }),
    openedBy: z.string().min(1),
    assignedTo: z.string().min(1).nullable(),
    evidenceDeadline: IsoDateTime.nullable(),
    decision: z.string().max(2000).nullable(),
    decisionReason: z.string().max(2000).nullable(),
    decidedAt: IsoDateTime.nullable(),
    appealDeadline: IsoDateTime.nullable(),
    createdAt: IsoDateTime,
    closedAt: IsoDateTime.nullable(),
  })
  .superRefine((d, ctx) => {
    if (["DECIDED", "APPEALED", "CLOSED"].includes(d.status) && !d.decidedAt) {
      ctx.addIssue({ code: "custom", message: `${d.status} requires decidedAt` });
    }
    if (d.status === "CLOSED" && !d.closedAt) {
      ctx.addIssue({ code: "custom", message: "CLOSED requires closedAt" });
    }
  });
export type Dispute = z.infer<typeof Dispute>;
