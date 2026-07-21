ALTER TABLE "payment" RENAME COLUMN "nowpayments_payment_id" TO "boomfi_payment_id";--> statement-breakpoint
ALTER TABLE "vip_subscription" RENAME COLUMN "nowpayments_subscription_id" TO "boomfi_subscription_id";--> statement-breakpoint
ALTER TABLE "payment" DROP CONSTRAINT "payment_nowpayments_payment_id_unique";--> statement-breakpoint
ALTER TABLE "vip_subscription" DROP CONSTRAINT "vip_subscription_nowpayments_subscription_id_unique";--> statement-breakpoint
ALTER TABLE "creator" ADD COLUMN "boomfi_account_ref" text;--> statement-breakpoint
ALTER TABLE "creator" ADD CONSTRAINT "creator_boomfi_account_ref_unique" UNIQUE("boomfi_account_ref");--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_boomfi_payment_id_unique" UNIQUE("boomfi_payment_id");--> statement-breakpoint
ALTER TABLE "vip_subscription" ADD CONSTRAINT "vip_subscription_boomfi_subscription_id_unique" UNIQUE("boomfi_subscription_id");