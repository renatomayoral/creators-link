CREATE TABLE "vip_plan" (
	"id" text PRIMARY KEY NOT NULL,
	"creator_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"amount" integer NOT NULL,
	"currency" text NOT NULL,
	"interval_day" integer NOT NULL,
	"stripe_price_id" text,
	"nowpayments_plan_id" text,
	"active" boolean NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vip_subscription" (
	"id" text PRIMARY KEY NOT NULL,
	"creator_id" text NOT NULL,
	"plan_id" text NOT NULL,
	"fan_email" text,
	"provider" text NOT NULL,
	"stripe_subscription_id" text,
	"stripe_customer_id" text,
	"nowpayments_subscription_id" text,
	"status" text NOT NULL,
	"current_period_end" timestamp,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "vip_subscription_stripe_subscription_id_unique" UNIQUE("stripe_subscription_id"),
	CONSTRAINT "vip_subscription_nowpayments_subscription_id_unique" UNIQUE("nowpayments_subscription_id")
);
--> statement-breakpoint
ALTER TABLE "creator" ADD COLUMN "stripe_account_id" text;--> statement-breakpoint
ALTER TABLE "creator" ADD COLUMN "stripe_onboarded" boolean NOT NULL;--> statement-breakpoint
ALTER TABLE "vip_plan" ADD CONSTRAINT "vip_plan_creator_id_creator_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creator"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vip_subscription" ADD CONSTRAINT "vip_subscription_creator_id_creator_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creator"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vip_subscription" ADD CONSTRAINT "vip_subscription_plan_id_vip_plan_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."vip_plan"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "vip_plan_creator_idx" ON "vip_plan" USING btree ("creator_id");--> statement-breakpoint
CREATE INDEX "vip_subscription_creator_idx" ON "vip_subscription" USING btree ("creator_id");--> statement-breakpoint
CREATE INDEX "vip_subscription_status_idx" ON "vip_subscription" USING btree ("status");--> statement-breakpoint
ALTER TABLE "creator" ADD CONSTRAINT "creator_stripe_account_id_unique" UNIQUE("stripe_account_id");