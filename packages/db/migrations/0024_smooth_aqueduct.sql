CREATE TABLE "ppv_content" (
	"id" text PRIMARY KEY NOT NULL,
	"creator_id" text NOT NULL,
	"title" text,
	"price_cents" integer NOT NULL,
	"currency" text NOT NULL,
	"media_type" text NOT NULL,
	"preview_file_id" text NOT NULL,
	"full_file_url" text NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ppv_purchase" (
	"id" text PRIMARY KEY NOT NULL,
	"ppv_content_id" text NOT NULL,
	"creator_id" text NOT NULL,
	"telegram_user_id" text NOT NULL,
	"boomfi_payment_id" text,
	"status" text NOT NULL,
	"created_at" timestamp NOT NULL,
	CONSTRAINT "ppv_purchase_boomfi_payment_id_unique" UNIQUE("boomfi_payment_id")
);
--> statement-breakpoint
ALTER TABLE "ppv_content" ADD CONSTRAINT "ppv_content_creator_id_creator_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creator"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ppv_purchase" ADD CONSTRAINT "ppv_purchase_ppv_content_id_ppv_content_id_fk" FOREIGN KEY ("ppv_content_id") REFERENCES "public"."ppv_content"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ppv_purchase" ADD CONSTRAINT "ppv_purchase_creator_id_creator_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creator"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ppv_content_creator_idx" ON "ppv_content" USING btree ("creator_id");--> statement-breakpoint
CREATE INDEX "ppv_purchase_content_idx" ON "ppv_purchase" USING btree ("ppv_content_id");--> statement-breakpoint
CREATE INDEX "ppv_purchase_fan_idx" ON "ppv_purchase" USING btree ("telegram_user_id");