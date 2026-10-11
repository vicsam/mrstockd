CREATE TYPE "public"."key_environment" AS ENUM('live', 'test');--> statement-breakpoint
ALTER TABLE "api_keys" ADD COLUMN "environment" "key_environment" DEFAULT 'live' NOT NULL;--> statement-breakpoint
CREATE INDEX "api_keys_listing_idx" ON "api_keys" USING btree ("listing_id");