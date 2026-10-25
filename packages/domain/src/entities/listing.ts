/** Listing lifecycle: DRAFT → PENDING_INSPECTION → VERIFIED → LIVE → PAUSED → RENTED → ARCHIVED. */
import { z } from "zod";
import { Id, IsoDateTime, Money } from "@rent/shared";

export const ListingStatus = z.enum([
  "DRAFT",
  "PENDING_INSPECTION",
  "VERIFIED",
  "LIVE",
  "PAUSED",
  "RENTED",
  "ARCHIVED",
]);
export type ListingStatus = z.infer<typeof ListingStatus>;

export const Listing = z
  .object({
    id: Id,
    propertyId: z.string().min(1),
    landlordUserId: z.string().min(1),
    rent: Money,
    deposit: Money,
    minLeaseMonths: z.number().int().min(1).max(120),
    /** Id of the latest inspection report standing behind VERIFIED status. */
    verifiedByInspectionId: z.string().min(1).nullable(),
    status: ListingStatus,
    publishedAt: IsoDateTime.nullable(),
    createdAt: IsoDateTime,
    updatedAt: IsoDateTime,
  })
  .superRefine((listing, ctx) => {
    if (listing.rent.currency !== listing.deposit.currency) {
      ctx.addIssue({ code: "custom", message: "rent and deposit currency must match" });
    }
    if (listing.status === "LIVE" && !listing.publishedAt) {
      ctx.addIssue({ code: "custom", message: "LIVE listing requires publishedAt" });
    }
    if (listing.status === "VERIFIED" && !listing.verifiedByInspectionId) {
      ctx.addIssue({
        code: "custom",
        message: "VERIFIED listing requires an inspection report reference",
      });
    }
  });
export type Listing = z.infer<typeof Listing>;
