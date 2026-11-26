import type { CATEGORY_ICONS } from "@/lib/domain/taxonomy";

/** Nomi delle icone nel menu a tendina (le icone sono in src/components/site/category-icon.tsx). */
export const ICON_LABEL: Record<(typeof CATEGORY_ICONS)[number], string> = {
  building: "Edificio",
  droplet: "Goccia",
  zap: "Fulmine",
  ruler: "Righello",
  roller: "Rullo",
  wrench: "Chiave inglese",
  sofa: "Divano",
  leaf: "Foglia",
  sparkles: "Brillantini",
  truck: "Furgone",
  blinds: "Tende",
  tiles: "Piastrelle",
};
