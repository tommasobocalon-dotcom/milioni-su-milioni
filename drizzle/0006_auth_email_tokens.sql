CREATE TYPE "public"."auth_token_purpose" AS ENUM('password_reset', 'email_verify');--> statement-breakpoint
CREATE TABLE "auth_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"purpose" "auth_token_purpose" NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "auth_tokens" ADD CONSTRAINT "auth_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "auth_tokens_user_idx" ON "auth_tokens" USING btree ("user_id","purpose");--> statement-breakpoint
-- Chi è entrato con Google/Apple ha già un'email verificata dal provider.
UPDATE "users" SET "email_verified_at" = "created_at" WHERE "id" IN (SELECT "user_id" FROM "oauth_accounts");--> statement-breakpoint
-- Come le altre tabelle (0004): chiusa alla Data API di Supabase.
ALTER TABLE "auth_tokens" ENABLE ROW LEVEL SECURITY;
