CREATE TABLE "splitfy_rate_limit" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"window_start" timestamp NOT NULL,
	"count" integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "splitfy_rate_limit_key_window_idx" ON "splitfy_rate_limit" USING btree ("key","window_start");