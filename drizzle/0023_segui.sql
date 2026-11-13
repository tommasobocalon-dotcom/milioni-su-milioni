-- "Segui" sulle aziende (13/11/2026): chi segue un'azienda vede i suoi nuovi lavori nella scheda "Seguiti" di
-- Ispirazione. Uno per account e per azienda. Spariscono da soli se si elimina l'azienda o l'account.
CREATE TABLE "partner_follows" (
	"partner_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "partner_follows_partner_id_user_id_pk" PRIMARY KEY("partner_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "partner_follows" ADD CONSTRAINT "partner_follows_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_follows" ADD CONSTRAINT "partner_follows_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "partner_follows_user_idx" ON "partner_follows" USING btree ("user_id");