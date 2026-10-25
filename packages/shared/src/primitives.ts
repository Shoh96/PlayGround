/**
 * Shared primitive types used across domain, apps, and packages.
 * Values are expressed in integer minor units; XOF has exponent 0
 * so amounts are whole CFA francs.
 */
import { z } from "zod";

export const Currency = z.enum(["XOF"]);
export type Currency = z.infer<typeof Currency>;

export const CURRENCY_INFO = {
  XOF: { name: "West African CFA franc", minorUnits: 1, decimals: 0 },
} as const satisfies Record<Currency, { name: string; minorUnits: number; decimals: number }>;

export const Money = z
  .object({
    amount: z
      .number()
      .int()
      .nonnegative()
      .describe("Amount in minor units (XOF: whole francs)"),
    currency: Currency,
  })
  .brand("Money");
export type Money = z.infer<typeof Money>;

export const money = (amount: number, currency: Currency = "XOF"): Money =>
  Money.parse({ amount, currency });

export const Id = z.string().min(1).brand("Id");
export type Id = z.infer<typeof Id>;
export const id = (value: string): Id => Id.parse(value);

export const Phone = z
  .string()
  .regex(/^\+[1-9]\d{6,14}$/u, "must be E.164, e.g. +2250701234567");
export type Phone = z.infer<typeof Phone>;

export const IsoDateTime = z.string().datetime({ offset: true });
export type IsoDateTime = z.infer<typeof IsoDateTime>;

/** Actor kinds per spec section "Actors"..role for System/Bot participants. */
export const ActorKind = z.enum([
  "owner",
  "landlord",
  "tenant",
  "inspector",
  "support",
  "admin",
  "system",
  "bot",
]);
export type ActorKind = z.infer<typeof ActorKind>;

export const Actor = z.object({
  kind: ActorKind,
  /** Stable user id, or system/bot identifier when not a human user. */
  id: z.string().min(1),
});
export type Actor = z.infer<typeof Actor>;
