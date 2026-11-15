-- Più tipi di contratto per gli immobili delle agenzie (15/11/2026): asta, affitto con riscatto, nuda proprietà, affitto transitorio.
ALTER TYPE "public"."property_contract" ADD VALUE 'auction';--> statement-breakpoint
ALTER TYPE "public"."property_contract" ADD VALUE 'rent_to_buy';--> statement-breakpoint
ALTER TYPE "public"."property_contract" ADD VALUE 'bare_ownership';--> statement-breakpoint
ALTER TYPE "public"."property_contract" ADD VALUE 'transitional_rent';