ALTER TABLE "creator" ADD COLUMN "boomfi_customer_id" text;--> statement-breakpoint
ALTER TABLE "creator" ADD CONSTRAINT "creator_boomfi_customer_id_unique" UNIQUE("boomfi_customer_id");