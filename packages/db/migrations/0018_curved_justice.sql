ALTER TABLE "creator" DROP CONSTRAINT "creator_nowpayments_customer_id_unique";--> statement-breakpoint
ALTER TABLE "creator" DROP CONSTRAINT "creator_boomfi_customer_id_unique";--> statement-breakpoint
ALTER TABLE "creator" DROP COLUMN "nowpayments_customer_id";--> statement-breakpoint
ALTER TABLE "creator" DROP COLUMN "boomfi_customer_id";