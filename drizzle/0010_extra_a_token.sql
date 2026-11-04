CREATE TABLE "area_extensions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partner_id" uuid NOT NULL,
	"province_id" smallint NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"tokens_spent" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "showcase_features" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partner_id" uuid NOT NULL,
	"portfolio_item_id" uuid NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"tokens_spent" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "portfolio_items" ADD COLUMN "video_url" text;--> statement-breakpoint
ALTER TABLE "area_extensions" ADD CONSTRAINT "area_extensions_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "area_extensions" ADD CONSTRAINT "area_extensions_province_id_provinces_id_fk" FOREIGN KEY ("province_id") REFERENCES "public"."provinces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "showcase_features" ADD CONSTRAINT "showcase_features_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "showcase_features" ADD CONSTRAINT "showcase_features_portfolio_item_id_portfolio_items_id_fk" FOREIGN KEY ("portfolio_item_id") REFERENCES "public"."portfolio_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "area_extensions_lookup_idx" ON "area_extensions" USING btree ("province_id","ends_at");--> statement-breakpoint
CREATE INDEX "showcase_features_ends_idx" ON "showcase_features" USING btree ("ends_at");--> statement-breakpoint
-- Come per le altre tabelle (0004): chiuse alla Data API di Supabase.
ALTER TABLE "area_extensions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "showcase_features" ENABLE ROW LEVEL SECURITY;
