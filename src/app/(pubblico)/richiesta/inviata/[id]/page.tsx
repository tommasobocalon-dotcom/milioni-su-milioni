import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { PartnerCard } from "@/components/site/partner-card";
import { ButtonLink } from "@/components/ui/button";
import { findPlace } from "@/lib/data/catalog";
import { connection } from "next/server";
import { recordImpressions, searchPartners } from "@/lib/data/search";
import { db } from "@/lib/db/client";
import { categories, leads, municipalities, partners } from "@/lib/db/schema";

export const metadata: Metadata = { title: "Richiesta inviata", robots: { index: false } };

export default function SentPage({ params }: PageProps<"/richiesta/inviata/[id]">) {
  return (
    <div className="container-page py-10">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-lg bg-muted" />}>
        {params.then((p) => (
          <Sent id={p.id} />
        ))}
      </Suspense>
    </div>
  );
}

async function Sent({ id }: { id: string }) {
  if (!z.uuid().safeParse(id).success) notFound();
  // Solo dati non personali: l'indirizzo contiene l'id della richiesta, non serve altro.
  const [lead] = await db
    .select({
      requestType: leads.requestType,
      charge: leads.charge,
      verifiedAt: leads.verifiedAt,
      callbackSlot: leads.callbackSlot,
      municipality: municipalities.name,
      partnerId: partners.id,
      partnerName: partners.displayName,
      partnerSlug: partners.slug,
      partnerType: partners.type,
      categoryId: categories.id,
      categorySlug: categories.slug,
      categoryPlural: categories.pluralName,
    })
    .from(leads)
    .innerJoin(partners, eq(partners.id, leads.partnerId))
    .innerJoin(categories, eq(categories.id, partners.categoryId))
    .innerJoin(municipalities, eq(municipalities.id, leads.municipalityId))
    .where(eq(leads.id, id));
  if (!lead) notFound();

  if (!lead.verifiedAt) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-4 text-center">
        <h1 className="font-display text-h1">Richiesta non ancora confermata</h1>
        <p className="text-body text-ink-2">Manca la conferma con il codice ricevuto via email.</p>
        <ButtonLink href={`/richiesta/${lead.partnerSlug}`}>Ricomincia la richiesta</ButtonLink>
      </div>
    );
  }

  const place = await findPlace(lead.municipality);
  const found = await searchPartners({ categoryId: lead.categoryId, place });
  await connection();
  recordImpressions(found);
  const { featured, results } = found;
  const alternatives = [...(featured ? [featured] : []), ...results].filter((p) => p.id !== lead.partnerId).slice(0, 2);
  const duplicate = lead.charge === "duplicate";
  const unavailable = lead.charge === "pending";

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col items-start gap-6 rounded-xl bg-brand-soft p-8 md:flex-row md:items-center">
        <div className="flex flex-col gap-3">
          <h1 className="font-display text-h1">
            {duplicate ? "Richiesta già inviata" : unavailable ? "Il partner non è disponibile" : "Richiesta inviata!"}
          </h1>
          <p className="max-w-2xl text-body-l">
            {duplicate
              ? `Avevi già inviato questa richiesta a ${lead.partnerName} negli ultimi 30 giorni: non la mandiamo una seconda volta.`
              : unavailable
                ? `${lead.partnerName} al momento non riceve nuove richieste. Qui sotto trovi altri ${lead.categoryPlural.toLowerCase()} della tua zona.`
                : `${lead.partnerName} ha ricevuto la tua richiesta (“${lead.requestType}”, ${lead.municipality}) e ti ricontatterà nella fascia ${lead.callbackSlot}.`}
          </p>
          {!duplicate && !unavailable && <p className="text-body-s text-neutro-700">Ti abbiamo mandato un&apos;email con il riepilogo.</p>}
        </div>
      </section>

      {!duplicate && !unavailable && (
        <section aria-labelledby="dopo" className="flex flex-col gap-4">
          <h2 id="dopo" className="font-display text-h2">
            Cosa succede ora
          </h2>
          <ol className="grid gap-4 md:grid-cols-3">
            {[
              ["Il partner riceve la notifica", "Arriva in pochi secondi, via email e nella sua Area Partner."],
              ["Ti ricontatta", `Nella fascia oraria che hai scelto: ${lead.callbackSlot}.`],
              ["Se non ti richiama", "Qui sotto trovi altri della tua zona a cui chiedere un contatto."],
            ].map(([t, d], i) => (
              <li key={t} className="flex flex-col gap-2 rounded-lg border border-line bg-surface p-5">
                <span className="inline-flex size-8 items-center justify-center rounded-full bg-primary text-body-s font-semibold text-on-brand">
                  {i + 1}
                </span>
                <h3 className="text-h4 font-semibold">{t}</h3>
                <p className="text-body-s text-ink-2">{d}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      {alternatives.length > 0 && (
        <section aria-labelledby="alternative" className="flex flex-col gap-4">
          <h2 id="alternative" className="font-display text-h2">
            {unavailable ? "Alternative nella tua zona" : "Vuoi chiedere anche ad altri?"}
          </h2>
          {alternatives.map((p) => (
            <PartnerCard key={p.id} p={p} />
          ))}
        </section>
      )}

      <Link
        href={lead.partnerType === "agency" ? "/trova-casa" : `/trova-professionista?categoria=${lead.categorySlug}`}
        className="self-start font-semibold text-primary underline"
      >
        Torna alla ricerca
      </Link>
    </div>
  );
}
