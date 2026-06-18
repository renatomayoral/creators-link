CREATE TABLE "platform_token" (
	"id" text PRIMARY KEY NOT NULL,
	"creator_id" text NOT NULL,
	"platform" text NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text,
	"expires_at" timestamp,
	"scopes" text[] DEFAULT '{}'::text[] NOT NULL,
	"platform_user_id" text,
	"platform_handle" text,
	"api_token" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "platform_token" ADD CONSTRAINT "platform_token_creator_id_creator_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creator"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "platform_token_creator_platform_idx" ON "platform_token" USING btree ("creator_id","platform");--> statement-breakpoint
CREATE INDEX "platform_token_creator_idx" ON "platform_token" USING btree ("creator_id");