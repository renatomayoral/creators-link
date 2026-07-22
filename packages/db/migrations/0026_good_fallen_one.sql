ALTER TABLE "creator" ADD COLUMN "stripe_payout_mode" text NOT NULL DEFAULT 'own';--> statement-breakpoint
ALTER TABLE "creator" ADD COLUMN "payout_hub_creator_id" text;