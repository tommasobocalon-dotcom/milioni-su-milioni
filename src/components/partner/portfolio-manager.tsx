import Image from "next/image";
import { Home, Image as ImageIcon, MapPin, Trash2 } from "lucide-react";
import { deletePortfolioItem, setPortfolioInspiration, setPortfolioStatus } from "@/app/area-partner/actions";
import { PortfolioForm } from "@/components/partner/portfolio-form";
import { Button } from "@/components/ui/button";
import { getMunicipalities } from "@/lib/data/catalog";
import { getPortfolio, getSubscription } from "@/lib/data/partner-area";
import { PREMIUM_WEIGHT } from "@/lib/domain/ranking";
import { formatEuro } from "@/lib/domain/format";
import { contractBadge, isMonthlyContract } from "@/lib/domain/property-contract";

const STATUS = [
  { value: "available", label: "Disponibile" },
  { value: "negotiating", label: "In trattativa" },
  { value: "sold", label: "Venduto / affittato" },
] as const;

/** Lavori svolti (o immobili per le agenzie) mostrati nella scheda pubblica. */
export async function PortfolioManager({ partnerId, isAgency }: { partnerId: string; isAgency: boolean }) {
  const [items, places, sub] = await Promise.all([getPortfolio(partnerId), getMunicipalities(), getSubscription(partnerId)]);
  const limitNote = sub
    ? sub.maxPortfolioItems === null
      ? `Progetti senza limiti con il piano ${sub.planName}`
      : `${items.length} di ${sub.maxPortfolioItems} progetti del piano ${sub.planName}`
    : null;
  return (
    <>
      <PortfolioForm
        isAgency={isAgency}
        places={places.map((p) => ({ id: p.id, label: `${p.name} (${p.provinceCode})` }))}
        canVideo={!!sub && sub.planWeight >= PREMIUM_WEIGHT}
        limitNote={limitNote}
      />

      <h2 className="text-h3 font-semibold">{isAgency ? "Immobili" : "Lavori svolti"}</h2>
      <section aria-label="Elementi del portfolio" className="rounded-lg border border-line bg-surface p-6">
        {items.length === 0 ? (
          <p className="text-center text-body-s text-ink-2">Ancora nessun elemento: aggiungi il primo dal modulo qui sopra.</p>
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => (
              <li key={item.id} className="flex flex-col gap-2">
                <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-md bg-muted text-ink-2">
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt={item.title}
                      fill
                      sizes="(min-width: 1280px) 30vw, (min-width: 640px) 45vw, 100vw"
                      className="object-cover"
                    />
                  ) : isAgency ? (
                    <Home className="size-8" aria-hidden />
                  ) : (
                    <ImageIcon className="size-8" aria-hidden />
                  )}
                </div>
                <p className="text-caption text-ink-2">
                  {[
                    item.contract && contractBadge(item.contract, null),
                    item.photos.length > 1 && `${item.photos.length} foto`,
                    item.inInspiration ? "Nella scheda e in Ispirazione" : "Solo nella scheda",
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                <p className="text-body-s font-semibold">
                  {item.title}
                  {item.priceCents !== null && ` · ${formatEuro(item.priceCents)}${item.contract && isMonthlyContract(item.contract) ? "/mese" : ""}`}
                </p>
                {item.municipality && (
                  <p className="inline-flex items-center gap-1 text-caption text-ink-2">
                    <MapPin className="size-3.5" aria-hidden /> {item.municipality}
                    {item.sqm && ` · ${item.sqm} m²`}
                    {item.rooms && ` · ${item.rooms} ${item.rooms === 1 ? "locale" : "locali"}`}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  {isAgency && (
                    <form action={setPortfolioStatus.bind(null, item.id)} className="flex items-center gap-2">
                      <label htmlFor={`st-${item.id}`} className="sr-only">
                        Stato di {item.title}
                      </label>
                      <select
                        id={`st-${item.id}`}
                        name="status"
                        defaultValue={item.status ?? "available"}
                        className="h-9 rounded-md border border-line bg-surface px-2 text-body-s"
                      >
                        {STATUS.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                      <Button size="s" variant="secondary">
                        Aggiorna
                      </Button>
                    </form>
                  )}
                  {item.imageUrl && (
                    <form action={setPortfolioInspiration.bind(null, item.id, !item.inInspiration)}>
                      <Button size="s" variant="secondary" aria-label={`${item.inInspiration ? "Togli da Ispirazione" : "Metti in Ispirazione"}: ${item.title}`}>
                        {item.inInspiration ? "Togli da Ispirazione" : "Metti in Ispirazione"}
                      </Button>
                    </form>
                  )}
                  <form action={deletePortfolioItem.bind(null, item.id)}>
                    <Button size="s" variant="danger" aria-label={`Elimina ${item.title}`}>
                      <Trash2 aria-hidden /> Elimina
                    </Button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
