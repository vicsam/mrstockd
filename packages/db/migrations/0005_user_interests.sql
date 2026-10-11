CREATE TABLE "user_interests" (
	"user_id" text PRIMARY KEY NOT NULL,
	"topics" text[] DEFAULT '{}'::text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
