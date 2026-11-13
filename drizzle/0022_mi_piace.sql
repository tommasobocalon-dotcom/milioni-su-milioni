-- "Mi piace" sui lavori di Ispirazione (13/11/2026): uno per account e per lavoro, messi da clienti e aziende
-- che hanno fatto l'accesso. Non sono recensioni né voti. Spariscono da soli se si elimina il lavoro o l'account.
CREATE TABLE "portfolio_likes" (
	"portfolio_item_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "portfolio_likes_portfolio_item_id_user_id_pk" PRIMARY KEY("portfolio_item_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "portfolio_likes" ADD CONSTRAINT "portfolio_likes_portfolio_item_id_portfolio_items_id_fk" FOREIGN KEY ("portfolio_item_id") REFERENCES "public"."portfolio_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_likes" ADD CONSTRAINT "portfolio_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "portfolio_likes_user_idx" ON "portfolio_likes" USING btree ("user_id");