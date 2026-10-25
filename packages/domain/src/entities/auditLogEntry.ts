/**
 * AuditLog entity validation: the storage-agnostic envelope for "every
 * financial or state change writes an immutable audit log entry".
 * BuildOrder: shared AppendOnlyAuditLog produces entries; this schema
 * validates them at the domain boundary (e.g. before DB insert).
 */
import { z } from "zod";
import { Actor, IsoDateTime } from "@rent/shared";

export const AuditLogEntry = z
  .object({
    seq: z.number().int().positive(),
    at: IsoDateTime,
    actor: Actor,
    action: z
      .string()
      .min(3)
      .regex(
        /^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)+$/u,
        "action must be dotted, e.g. 'lease.created'",
      ),
    entityType: z.string().min(1),
    entityId: z.string().min(1),
    before: z.unknown().nullable(),
    after: z.unknown(),
    reason: z.string().min(1),
    traceId: z.string().min(1).optional(),
  })
  .strict();
export type AuditLogEntry = z.infer<typeof AuditLogEntry>;

/** Entity names allowed into the audit trail (register new ones here). */
export const AuditableEntity = z.enum([
  "User",
  "KycRecord",
  "Property",
  "Listing",
  "Lease",
  "Payment",
  "LedgerEntry",
  "RefundRequest",
  "Dispute",
  "DisputeMessage",
]);
export type AuditableEntity = z.infer<typeof AuditableEntity>;
