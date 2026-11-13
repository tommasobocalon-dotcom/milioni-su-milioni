-- Violazioni per i commenti tolti dal gestionale (13/11/2026): da quelle non annullate si legge la sanzione a
-- gradini (avviso, 7 giorni, 30 giorni, blocco dei commenti). Tengono il testo del commento per le contestazioni
-- e quando è partita l'email con il motivo.
CREATE TABLE "user_strikes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"comment_id" uuid,
	"reason" "comment_report_reason" NOT NULL,
	"comment_body" text NOT NULL,
	"note" text,
	"decided_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"notified_at" timestamp with time zone,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "user_strikes" ADD CONSTRAINT "user_strikes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_strikes" ADD CONSTRAINT "user_strikes_comment_id_portfolio_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."portfolio_comments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_strikes_user_idx" ON "user_strikes" USING btree ("user_id");