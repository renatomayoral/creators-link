ALTER TABLE "creator" ADD COLUMN "custom_domain" text;--> statement-breakpoint
ALTER TABLE "creator" ADD CONSTRAINT "creator_custom_domain_unique" UNIQUE("custom_domain");