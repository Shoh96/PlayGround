/** Property: physical place of type + address + optional geolocation. */
import { z } from "zod";
import { Id, IsoDateTime } from "@rent/shared";

export const PropertyKind = z.enum([
  "APARTMENT",
  "HOUSE",
  "STUDIO",
  "ROOM",
  "COMMERCIAL",
  "LAND",
  "PARKING",
]);
export type PropertyKind = z.infer<typeof PropertyKind>;

export const PropertyStatus = z.enum([
  "PENDING_VERIFICATION",
  "VERIFIED",
  "SUSPENDED",
  "ARCHIVED",
]);
export type PropertyStatus = z.infer<typeof PropertyStatus>;

export const GeoPoint = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});
export type GeoPoint = z.infer<typeof GeoPoint>;

export const Address = z.object({
  line1: z.string().min(3).max(200),
  line2: z.string().max(200).optional(),
  city: z.string().min(2).max(100),
  region: z.string().min(2).max(100),
  country: z.string().length(2).toUpperCase(),
  location: GeoPoint.optional(),
});
export type Address = z.infer<typeof Address>;

export const Property = z.object({
  id: Id,
  ownerUserId: z.string().min(1),
  /** Optional delegated manager (landlord/actor distinct from owner). */
  managerUserId: z.string().min(1).nullable(),
  title: z.string().min(5).max(140),
  kind: PropertyKind,
  address: Address,
  /** Ownership/mandate document reference; required for title-verified tier. */
  ownershipDocRef: z.string().min(1).nullable(),
  status: PropertyStatus,
  createdAt: IsoDateTime,
  updatedAt: IsoDateTime,
});
export type Property = z.infer<typeof Property>;
