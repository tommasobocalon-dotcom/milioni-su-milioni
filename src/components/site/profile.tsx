import {
  CalendarDays,
  Home,
  Image as ImageIcon,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import { Badge, publicPlanBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { LogoPartner } from "@/components/ui/logo-partner";
import type { PartnerProfile } from "@/lib/data/partners";
import {
  formatEuro,
  formatPriceRange,
  PRICE_UNIT_LABEL,
  type PriceUnit,
} from "@/lib/domain/format";
import { ProjectPhotos } from "@/components/site/project-photos";
import { cn } from "@/lib/utils";
import { videoEmbedUrl } from "@/lib/domain/extras";
import { contractBadge, isMonthlyContract } from "@/lib/domain/property-contract";

/** Profilo pubblico del partner (PRD §5.4), stesso impianto per agenzie e professionisti. */
export function ProfileView({ p }: { p: PartnerProfile }) {
  const isAgency = p.type === "agency";
  const plan = publicPlanBadge(p.planCode);
  const portfolioLabel = isAgency ? "Immobili" : "Lavori svolti";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": isAgency ? "RealEstateAgent" : "HomeAndConstructionBusiness",
    name: p.displayName,
    description: p.description,
    address: {
      "@type": "PostalAddress",
      streetAddress: p.address ?? undefined,
      addressLocality: p.municipalityName,
      addressRegion: p.provinceCode,
      addressCountry: "IT",
    },
    areaServed: p.areas,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <div aria-hidden className="h-28 bg-brand-soft md:h-40" />
      <div className="container-page -mt-12 flex flex-col gap-6 pb-16 md:-mt-16">
        <header className="flex flex-col gap-5 md:flex-row md:items-end">
          <LogoPartner
            name={p.displayName}
            src={p.logoUrl}
            size={112}
            className="border-4 border-page"
          />
          <div className="flex flex-1 flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-h1">{p.displayName}</h1>
              {p.verified && <Badge kind="verified" />}
              {/* Partner Elite lilla come in Trova professionista, non giallo (13/11/2026). */}
              {plan && <Badge kind={plan} className={cn(plan === "premium" && "bg-lavanda-300 [&>svg]:text-ambra-500")} />}
            </div>
            <p className="text-body text-ink-2">
              {p.categoryName} · {p.tagline} · {p.municipalityName} (
              {p.provinceCode})
            </p>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-body-s text-ink-2">
              {p.verified && (
                <span className="inline-flex items-center gap-1">
                  <ShieldCheck className="size-4" aria-hidden /> P.IVA
                  verificata
                </span>
              )}
              {p.foundedYear && (
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="size-4" aria-hidden /> Dal{" "}
                  {p.foundedYear}
                </span>
              )}
            </div>
          </div>
        </header>

        <nav
          aria-label="Sezioni del profilo"
          className="flex gap-6 overflow-x-auto border-b border-line text-body-s font-semibold"
        >
          {[
            ["#panoramica", "Panoramica"],
            ["#prezzi", isAgency ? "Servizi e costi" : "Listino prezzi"],
            ["#portfolio", `${portfolioLabel} (${p.portfolio.length})`],
            ["#zone", "Zone servite"],
          ].map(([href, label]) => (
            <a
              key={href}
              href={href}
              className="shrink-0 border-b-2 border-transparent pb-3 hover:border-primary hover:text-primary"
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="flex min-w-0 flex-col gap-6">
            <section
              id="panoramica"
              className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-6"
            >
              <h2 className="font-display text-h2">Chi siamo</h2>
              {p.description ? (
                <p className="text-body">{p.description}</p>
              ) : (
                <p className="text-body-s text-ink-2">
                  {p.tagline}. Il partner non ha ancora scritto una
                  presentazione completa.
                </p>
              )}
              <ul
                className="flex flex-wrap gap-2"
                aria-label="Specializzazioni"
              >
                {p.specialties.map((s) => (
                  <li key={s}>
                    <Chip>{s}</Chip>
                  </li>
                ))}
              </ul>
            </section>

            <section
              id="prezzi"
              className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-6"
            >
              <h2 className="font-display text-h2">
                {isAgency
                  ? "Servizi e costi indicativi"
                  : "Listino prezzi indicativi"}
              </h2>
              {p.priceList.length === 0 ? (
                <p className="text-body-s text-ink-2">
                  Il partner non ha ancora pubblicato prezzi indicativi.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-left text-body-s">
                    <thead className="bg-subtle text-caption text-ink-2">
                      <tr>
                        <th className="px-3 py-2 font-semibold">Servizio</th>
                        <th className="px-3 py-2 font-semibold">Unità</th>
                        <th className="px-3 py-2 font-semibold">
                          Prezzo indicativo
                        </th>
                        <th className="px-3 py-2 font-semibold">Note</th>
                      </tr>
                    </thead>
                    <tbody>
                      {p.priceList.map((row) => (
                        <tr
                          key={row.id}
                          className="border-b border-line last:border-0"
                        >
                          <td className="px-3 py-3 font-medium">
                            {row.serviceName}
                          </td>
                          <td className="px-3 py-3 text-ink-2">
                            {PRICE_UNIT_LABEL[row.unit as PriceUnit]}
                          </td>
                          <td className="px-3 py-3 font-semibold">
                            {formatPriceRange(
                              row.priceFrom,
                              row.priceTo,
                              row.unit as PriceUnit,
                            ) ?? "Su preventivo"}
                          </td>
                          <td className="px-3 py-3 text-ink-2">{row.notes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="text-caption text-ink-2">
                * Prezzi indicativi pubblicati dal partner, non vincolanti. Il
                preventivo definitivo arriva dopo il contatto.
              </p>
            </section>

            <section
              id="portfolio"
              className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-6"
            >
              <h2 className="font-display text-h2">
                {isAgency ? "Immobili in portfolio" : "Lavori svolti"}
              </h2>
              {p.portfolio.length === 0 ? (
                <p className="text-body-s text-ink-2">
                  Ancora nessun elemento nel portfolio.
                </p>
              ) : (
                <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {p.portfolio.map((item) => (
                    <li key={item.id} className="flex flex-col gap-2">
                      <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-md bg-muted text-ink-2">
                        {item.videoUrl && videoEmbedUrl(item.videoUrl) ? (
                          <iframe
                            src={videoEmbedUrl(item.videoUrl)!}
                            title={`Video: ${item.title}`}
                            loading="lazy"
                            allow="encrypted-media; picture-in-picture; fullscreen"
                            referrerPolicy="strict-origin-when-cross-origin"
                            className="absolute inset-0 size-full"
                          />
                        ) : item.imageUrl ? (
                          <ProjectPhotos
                            photos={item.photos.length ? item.photos : [item.imageUrl]}
                            title={item.title}
                            sizes="(min-width: 1280px) 30vw, (min-width: 640px) 45vw, 100vw"
                          />
                        ) : item.kind === "property" ? (
                          <Home className="size-8" aria-hidden />
                        ) : (
                          <ImageIcon className="size-8" aria-hidden />
                        )}
                        {item.hasBeforeAfter && (
                          <span className="absolute top-2 left-2 rounded-full bg-surface px-2 py-0.5 text-caption font-semibold">
                            Prima / Dopo
                          </span>
                        )}
                        {item.contract && (
                          <span className="absolute top-2 left-2 rounded-full bg-surface px-2 py-0.5 text-caption font-semibold">
                            {contractBadge(item.contract, item.status)}
                          </span>
                        )}
                      </div>
                      <p className="text-body-s font-semibold">
                        {item.title}
                        {item.priceCents !== null &&
                          ` · ${formatEuro(item.priceCents)}${item.contract && isMonthlyContract(item.contract) ? "/mese" : ""}`}
                      </p>
                      {item.description && (
                        <p className="line-clamp-2 text-caption text-ink-2">
                          {item.description}
                        </p>
                      )}
                      <p className="inline-flex items-center gap-1 text-caption text-ink-2">
                        <MapPin className="size-3.5" aria-hidden />
                        {item.municipality}
                        {item.sqm && ` · ${item.sqm} m²`}
                        {item.rooms &&
                          ` · ${item.rooms} ${item.rooms === 1 ? "locale" : "locali"}`}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

          </div>

          <aside className="flex flex-col gap-6 lg:sticky lg:top-24 lg:self-start">
            <section className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-6">
              <div className="flex items-center gap-3">
                <div>
                  <h2 className="text-h4 font-semibold">
                    Richiedi un contatto
                  </h2>
                  <p className="text-body-s text-ink-2">
                    Gratis e senza impegno
                  </p>
                </div>
              </div>
              <ul className="flex flex-col gap-1.5 text-body-s">
                <li>✓ Richiesta confermata via email, niente spam</li>
                <li>✓ I tuoi dati vanno solo a questo partner</li>
              </ul>
              <ButtonLink href={`/richiesta/${p.slug}`}>
                Richiedi contatto
              </ButtonLink>
            </section>

            <section
              id="zone"
              className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-6"
            >
              <h2 className="text-h4 font-semibold">Zone servite</h2>
              <ul className="flex flex-wrap gap-2">
                {p.areas.map((a) => (
                  <li key={a}>
                    <Chip>{a}</Chip>
                  </li>
                ))}
              </ul>
            </section>

            {p.openingHours.length > 0 && (
              <section className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-6">
                <h2 className="text-h4 font-semibold">Orari</h2>
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-body-s">
                  {p.openingHours.map((h) => (
                    <div key={h.label} className="contents">
                      <dt className="text-ink-2">{h.label}</dt>
                      <dd className="text-right font-semibold">{h.value}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}

            <section className="flex flex-col gap-1 rounded-lg border border-line bg-surface p-6 text-body-s">
              <h2 className="mb-2 text-h4 font-semibold">Dati aziendali</h2>
              <p className="font-semibold">{p.businessName}</p>
              {p.address && <p>Sede legale: {p.address}</p>}
              <p>P. IVA {p.vatNumber}</p>
            </section>

            {p.hideDirectContacts && (
              <p className="text-caption text-ink-2">
                Contatti diretti nascosti dal partner: le richieste passano dal
                modulo verificato.
              </p>
            )}
          </aside>
        </div>
      </div>
    </>
  );
}
