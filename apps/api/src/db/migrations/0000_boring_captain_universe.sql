CREATE TABLE "audit_log" (
	"seq" bigserial PRIMARY KEY NOT NULL,
	"at" timestamp with time zone NOT NULL,
	"actor" jsonb NOT NULL,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"before" jsonb,
	"after" jsonb NOT NULL,
	"reason" text NOT NULL,
	"trace_id" text
);
--> statement-breakpoint
CREATE TABLE "kyc_records" (
	"user_id" text PRIMARY KEY NOT NULL,
	"tier" text NOT NULL,
	"status" text NOT NULL,
	"pending_tier" text,
	"phone_verified_at" timestamp with time zone,
	"id_document_ref" text,
	"address_proof_ref" text,
	"title_doc_ref" text,
	"payout_name" text,
	"verified_at" timestamp with time zone,
	"verified_by" text,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"phone" text NOT NULL,
	"display_name" text NOT NULL,
	"roles" text[] NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "users_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
ALTER TABLE "kyc_records" ADD CONSTRAINT "kyc_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_log_entity_idx" ON "audit_log" USING btree ("entity_type","entity_id");