-- Add new fields to creator
ALTER TABLE "creator"
  ADD COLUMN "channel_photo_url" text,
  ADD COLUMN "pix_key" text,
  ADD COLUMN "pix_key_type" text,
  ADD COLUMN "platform_fee_pct" text NOT NULL DEFAULT '10.00',
  ADD COLUMN "accepted_payments" text[] NOT NULL DEFAULT '{}';

-- Drop old single-price columns from vip_plan (kept as nullable for safe migration)
ALTER TABLE "vip_plan"
  DROP COLUMN IF EXISTS "amount",
  DROP COLUMN IF EXISTS "currency",
  DROP COLUMN IF EXISTS "stripe_price_id",
  DROP COLUMN IF EXISTS "nowpayments_plan_id";

-- New multi-currency price table
CREATE TABLE "vip_plan_price" (
  "id" text PRIMARY KEY NOT NULL,
  "plan_id" text NOT NULL REFERENCES "vip_plan"("id") ON DELETE CASCADE,
  "currency" text NOT NULL,
  "amount_cents" integer NOT NULL,
  "provider" text NOT NULL,
  "stripe_price_id" text,
  "active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX "vip_plan_price_plan_idx" ON "vip_plan_price" ("plan_id");
CREATE UNIQUE INDEX "vip_plan_price_plan_currency_provider_idx" ON "vip_plan_price" ("plan_id", "currency", "provider");
