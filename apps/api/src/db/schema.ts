import { bigserial, index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  phone: text("phone").notNull().unique(),
  displayName: text("display_name").notNull(),
  roles: text("roles").array().notNull(),
  status: text("status").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
});

export const kycRecords = pgTable("kyc_records", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id),
  tier: text("tier").notNull(),
  status: text("status").notNull(),
  pendingTier: text("pending_tier"),
  phoneVerifiedAt: timestamp("phone_verified_at", { withTimezone: true }),
  idDocumentRef: text("id_document_ref"),
  addressProofRef: text("address_proof_ref"),
  titleDocRef: text("title_doc_ref"),
  payoutName: text("payout_name"),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  verifiedBy: text("verified_by"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

export const auditLog = pgTable(
  "audit_log",
  {
    seq: bigserial("seq", { mode: "number" }).primaryKey(),
    at: timestamp("at", { withTimezone: true }).notNull(),
    actor: jsonb("actor").notNull(),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    before: jsonb("before"),
    after: jsonb("after").notNull(),
    reason: text("reason").notNull(),
    traceId: text("trace_id"),
  },
  (t) => [index("audit_log_entity_idx").on(t.entityType, t.entityId)],
);
