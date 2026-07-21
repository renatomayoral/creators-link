CREATE TABLE "creator_crypto_wallet" (
	"id" text PRIMARY KEY NOT NULL,
	"creator_id" text NOT NULL,
	"coin_key" text NOT NULL,
	"wallet_address" text NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "creator_crypto_wallet" ADD CONSTRAINT "creator_crypto_wallet_creator_id_creator_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creator"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "creator_crypto_wallet_creator_idx" ON "creator_crypto_wallet" USING btree ("creator_id");--> statement-breakpoint
CREATE UNIQUE INDEX "creator_crypto_wallet_creator_coin_idx" ON "creator_crypto_wallet" USING btree ("creator_id","coin_key");