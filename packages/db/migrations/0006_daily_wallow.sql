ALTER TABLE "user_profile" ADD COLUMN "stripe_mode" text;--> statement-breakpoint
ALTER TABLE "user_profile" ADD COLUMN "stripe_account_id" text;--> statement-breakpoint
ALTER TABLE "user_profile" ADD COLUMN "stripe_onboarded" boolean NOT NULL;