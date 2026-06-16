CREATE TABLE "platform" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"color" text NOT NULL,
	"base_url" text NOT NULL,
	"sort_order" integer NOT NULL,
	"active" boolean NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "platform_key_idx" ON "platform" USING btree ("key");