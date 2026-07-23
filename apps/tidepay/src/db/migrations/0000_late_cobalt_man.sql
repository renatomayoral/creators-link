CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "splitfy_charge" (
	"id" text PRIMARY KEY NOT NULL,
	"subscription_id" text NOT NULL,
	"merchant_id" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"gross_amount" text NOT NULL,
	"platform_amount" text NOT NULL,
	"merchant_amount" text NOT NULL,
	"token_key" text NOT NULL,
	"chain_id" integer NOT NULL,
	"pull_tx_hash" text,
	"merchant_transfer_tx_hash" text,
	"platform_transfer_tx_hash" text,
	"status" text NOT NULL,
	"failure_reason" text,
	"attempts" integer NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "splitfy_merchant" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"api_key_hash" text NOT NULL,
	"api_key_prefix" text NOT NULL,
	"take_rate_pct" text NOT NULL,
	"platform_wallet" text,
	"webhook_url" text,
	"webhook_secret" text,
	"status" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "splitfy_plan" (
	"id" text PRIMARY KEY NOT NULL,
	"merchant_id" text NOT NULL,
	"name" text NOT NULL,
	"amount" text NOT NULL,
	"token_key" text NOT NULL,
	"chain_id" integer NOT NULL,
	"interval_day" integer NOT NULL,
	"merchant_destination_wallet" text NOT NULL,
	"active" boolean NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "splitfy_subscription" (
	"id" text PRIMARY KEY NOT NULL,
	"merchant_id" text NOT NULL,
	"plan_id" text NOT NULL,
	"subscriber_wallet" text,
	"status" text NOT NULL,
	"allowance_confirmed" boolean NOT NULL,
	"current_period_end" timestamp,
	"chain_id" integer NOT NULL,
	"merchant_reference_id" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean NOT NULL,
	"image" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "splitfy_webhook_delivery" (
	"id" text PRIMARY KEY NOT NULL,
	"merchant_id" text NOT NULL,
	"event" text NOT NULL,
	"payload" text NOT NULL,
	"signature" text NOT NULL,
	"status" text NOT NULL,
	"attempts" integer NOT NULL,
	"last_attempt_at" timestamp,
	"response_status" integer,
	"next_retry_at" timestamp,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "splitfy_charge" ADD CONSTRAINT "splitfy_charge_subscription_id_splitfy_subscription_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."splitfy_subscription"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "splitfy_charge" ADD CONSTRAINT "splitfy_charge_merchant_id_splitfy_merchant_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."splitfy_merchant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "splitfy_plan" ADD CONSTRAINT "splitfy_plan_merchant_id_splitfy_merchant_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."splitfy_merchant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "splitfy_subscription" ADD CONSTRAINT "splitfy_subscription_merchant_id_splitfy_merchant_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."splitfy_merchant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "splitfy_subscription" ADD CONSTRAINT "splitfy_subscription_plan_id_splitfy_plan_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."splitfy_plan"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "splitfy_webhook_delivery" ADD CONSTRAINT "splitfy_webhook_delivery_merchant_id_splitfy_merchant_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."splitfy_merchant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "splitfy_charge_idempotency_key_idx" ON "splitfy_charge" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "splitfy_charge_subscription_id_idx" ON "splitfy_charge" USING btree ("subscription_id");--> statement-breakpoint
CREATE INDEX "splitfy_charge_status_idx" ON "splitfy_charge" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "splitfy_merchant_api_key_hash_idx" ON "splitfy_merchant" USING btree ("api_key_hash");--> statement-breakpoint
CREATE INDEX "splitfy_merchant_api_key_prefix_idx" ON "splitfy_merchant" USING btree ("api_key_prefix");--> statement-breakpoint
CREATE INDEX "splitfy_plan_merchant_id_idx" ON "splitfy_plan" USING btree ("merchant_id");--> statement-breakpoint
CREATE INDEX "splitfy_subscription_merchant_id_idx" ON "splitfy_subscription" USING btree ("merchant_id");--> statement-breakpoint
CREATE INDEX "splitfy_subscription_status_idx" ON "splitfy_subscription" USING btree ("status");--> statement-breakpoint
CREATE INDEX "splitfy_subscription_current_period_end_idx" ON "splitfy_subscription" USING btree ("current_period_end");--> statement-breakpoint
CREATE UNIQUE INDEX "splitfy_subscription_plan_wallet_idx" ON "splitfy_subscription" USING btree ("plan_id","subscriber_wallet");--> statement-breakpoint
CREATE INDEX "splitfy_webhook_delivery_merchant_id_idx" ON "splitfy_webhook_delivery" USING btree ("merchant_id");--> statement-breakpoint
CREATE INDEX "splitfy_webhook_delivery_status_idx" ON "splitfy_webhook_delivery" USING btree ("status");--> statement-breakpoint
CREATE INDEX "splitfy_webhook_delivery_next_retry_at_idx" ON "splitfy_webhook_delivery" USING btree ("next_retry_at");