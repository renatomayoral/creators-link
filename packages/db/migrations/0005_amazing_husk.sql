ALTER TABLE "user_profile" ADD COLUMN "onboarding_step" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "user_profile" ADD COLUMN "selected_platforms" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "creator" ADD COLUMN "telegram_bot_token" text;