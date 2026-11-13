-- Commenti sotto i lavori di Ispirazione (13/11/2026), con segnalazioni, persone bloccate o limitate dall'azienda
-- e parole scelte dall'azienda che mandano un commento in attesa di approvazione. Non sono recensioni né voti.
CREATE TYPE "public"."block_mode" AS ENUM('blocked', 'limited');--> statement-breakpoint
CREATE TYPE "public"."comment_report_reason" AS ENUM('spam', 'offensive', 'illegal', 'personal_data', 'other');--> statement-breakpoint
CREATE TYPE "public"."comment_status" AS ENUM('visible', 'pending', 'hidden', 'removed');--> statement-breakpoint
CREATE TABLE "comment_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"comment_id" uuid NOT NULL,
	"reporter_id" uuid NOT NULL,
	"reason" "comment_report_reason" NOT NULL,
	"note" text,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "partner_blocks" (
	"partner_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"mode" "block_mode" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "partner_blocks_partner_id_user_id_pk" PRIMARY KEY("partner_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "portfolio_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"portfolio_item_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"body" text NOT NULL,
	"status" "comment_status" DEFAULT 'visible' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "partners" ADD COLUMN "hidden_words" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "comment_reports" ADD CONSTRAINT "comment_reports_comment_id_portfolio_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."portfolio_comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment_reports" ADD CONSTRAINT "comment_reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_blocks" ADD CONSTRAINT "partner_blocks_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_blocks" ADD CONSTRAINT "partner_blocks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_comments" ADD CONSTRAINT "portfolio_comments_portfolio_item_id_portfolio_items_id_fk" FOREIGN KEY ("portfolio_item_id") REFERENCES "public"."portfolio_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_comments" ADD CONSTRAINT "portfolio_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "comment_reports_once_idx" ON "comment_reports" USING btree ("comment_id","reporter_id");--> statement-breakpoint
CREATE INDEX "comment_reports_status_idx" ON "comment_reports" USING btree ("status");--> statement-breakpoint
CREATE INDEX "portfolio_comments_item_idx" ON "portfolio_comments" USING btree ("portfolio_item_id","created_at");--> statement-breakpoint
CREATE INDEX "portfolio_comments_user_idx" ON "portfolio_comments" USING btree ("user_id","created_at");