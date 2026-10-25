/** Lease + booking-policy acceptance record. */
import { z } from "zod";
import { Id, IsoDateTime, Money } from "@rent/shared";

export const LeaseStatus = z.enum([
  "PENDING_SIGNATURE",
  "ACTIVE",
  "ENDED",
  "TERMINATED_EARLY",
  "CANCELLED",
]);
export type LeaseStatus = z.infer<typeof LeaseStatus>;

export const Lease = z
  .object({
    id: Id,
    listingId: z.string().min(1),
    propertyId: z.string().min(1),
    landlordUserId: z.string().min(1),
    tenantUserId: z.string().min(1),
    rent: Money,
    deposit: Money,
    startDate: IsoDateTime,
    endDate: IsoDateTime.nullable(),
    rentDueDay: z.number().int().min(1).max(31),
    /** Version id of booking/cancellation policy accepted at signing. */
    policyVersion: z.string().min(1),
    acceptedAt: IsoDateTime.nullable(),
    status: LeaseStatus,
    createdAt: IsoDateTime,
    updatedAt: IsoDateTime,
  })
  .superRefine((lease, ctx) => {
    if (lease.endDate && Date.parse(lease.endDate) <= Date.parse(lease.startDate)) {
      ctx.addIssue({ code: "custom", message: "endDate must be after startDate" });
    }
    if (lease.status !== "PENDING_SIGNATURE" && !lease.acceptedAt) {
      ctx.addIssue({ code: "custom", message: "active lease requires acceptedAt" });
    }
  });
export type Lease = z.infer<typeof Lease>;
