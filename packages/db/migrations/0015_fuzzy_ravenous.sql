CREATE TABLE "payment" (
	"id" text PRIMARY KEY NOT NULL,
	"creator_id" text NOT NULL,
	"vip_subscription_id" text,
	"fan_email" text,
	"provider" text NOT NULL,
	"source" text NOT NULL,
	"stripe_invoice_id" text,
	"nowpayments_payment_id" text,
	"currency" text NOT NULL,
	"gross_cents" integer NOT NULL,
	"provider_fee_cents" integer NOT NULL,
	"fx_fee_cents" integer NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp NOT NULL,
	CONSTRAINT "payment_stripe_invoice_id_unique" UNIQUE("stripe_invoice_id"),
	CONSTRAINT "payment_nowpayments_payment_id_unique" UNIQUE("nowpayments_payment_id")
);
--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_creator_id_creator_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creator"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_vip_subscription_id_vip_subscription_id_fk" FOREIGN KEY ("vip_subscription_id") REFERENCES "public"."vip_subscription"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payment_creator_created_idx" ON "payment" USING btree ("creator_id","created_at");--> statement-breakpoint
CREATE INDEX "payment_vip_subscription_idx" ON "payment" USING btree ("vip_subscription_id");