ALTER TABLE "listings" ADD COLUMN "review_note" text;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "published_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "search_vector" "tsvector" GENERATED ALWAYS AS (setweight(to_tsvector('english', coalesce(name, '')), 'A') || setweight(to_tsvector('english', coalesce(summary, '')), 'B') || setweight(to_tsvector('english', coalesce(description, '')), 'C')) STORED;--> statement-breakpoint
CREATE INDEX "listings_status_idx" ON "listings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "listings_search_idx" ON "listings" USING gin ("search_vector");