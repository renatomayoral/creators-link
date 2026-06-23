ALTER TABLE "creator" ADD COLUMN "nowpayments_customer_id" text;--> statement-breakpoint
ALTER TABLE "creator" ADD COLUMN "crypto_withdraw_address" text;--> statement-breakpoint
ALTER TABLE "creator" ADD COLUMN "crypto_withdraw_currency" text;--> statement-breakpoint
ALTER TABLE "creator" ADD COLUMN "crypto_auto_withdraw" boolean NOT NULL DEFAULT false;--> statement-breakpoint
ALTER TABLE "creator" ADD CONSTRAINT "creator_nowpayments_customer_id_unique" UNIQUE("nowpayments_customer_id");