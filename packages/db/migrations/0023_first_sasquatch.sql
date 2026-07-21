ALTER TABLE "creator_crypto_wallet" RENAME TO "creator_crypto_coin";--> statement-breakpoint
ALTER TABLE "creator_crypto_coin" DROP CONSTRAINT "creator_crypto_wallet_creator_id_creator_id_fk";
--> statement-breakpoint
DROP INDEX "creator_crypto_wallet_creator_idx";--> statement-breakpoint
DROP INDEX "creator_crypto_wallet_creator_coin_idx";--> statement-breakpoint
ALTER TABLE "payment" ADD COLUMN "creator_payout_status" text NOT NULL;--> statement-breakpoint
ALTER TABLE "creator_crypto_coin" ADD CONSTRAINT "creator_crypto_coin_creator_id_creator_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creator"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "creator_crypto_coin_creator_idx" ON "creator_crypto_coin" USING btree ("creator_id");--> statement-breakpoint
CREATE UNIQUE INDEX "creator_crypto_coin_creator_coin_idx" ON "creator_crypto_coin" USING btree ("creator_id","coin_key");--> statement-breakpoint
ALTER TABLE "creator_crypto_coin" DROP COLUMN "wallet_address";