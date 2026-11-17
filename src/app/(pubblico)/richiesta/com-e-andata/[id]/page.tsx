import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { PartnerCard } from "@/components/site/partner-card";
import { Button } from "@/components/ui/button";
import { alternativesTo } from "@/lib/data/search";
import { db } from "@/lib/db/client";
import { categories, leads, municipalities, partners } from "@/lib/db/schema";
import { answer } from "./actions";

export const metadata: Metadata = { title: "Com'è andata?", robots: { index: false } };

export default function FollowUpPage({ params }: PageProps<"/richiesta/com-e-andata/[id]">) {
  return (
    <div className="container-page py-10">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-lg bg-muted" />}>
        {params.then((p) => (
          <FollowUp id={p.id} />
        ))}
      </Suspense>
    </div>
  );
}

async function FollowUp({ id }: { id: string }) {
  if (!z.uuid().safeParse(id).success) notFound();
  // Solo dati non personali, come nella pagina di conferma: l'indirizzo arriva per email al cliente.
  const [lead] = await db
    .select({
      requestType: leads.requestType,
      deliveredAt: leads.deliveredAt,
      contacted: leads.clientContacted,
      municipality: municipalities.name,
      partnerId: partners.id,
      partnerName: partners.displayName,
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
  if (!lead?.deliveredAt) notFound();

  const searchHref = lead.partnerType === "agency" ? "/trova-casa" : `/trova-professionista?categoria=${lead.categorySlug}`;
  const backToSearch = (
    <Link href={searchHref} className="self-start font-semibold text-primary underline">
      Torna alla ricerca
    </Link>
  );

  if (lead.contacted === null) {
    return (
      <section className="mx-auto flex max-w-xl flex-col items-center gap-6 text-center">
        <h1 className="font-display text-h1">Com&apos;è andata con {lead.partnerName}?</h1>
        <p className="text-body-l text-ink-2">
          Hai chiesto a {lead.partnerName} di ricontattarti per “{lead.requestType}” a {lead.municipality}. Ti ha richiamato?
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <form action={answer.bind(null, id, true)}>
            <Button type="submit">Sì, mi ha ricontattato</Button>
          </form>
          <form action={answer.bind(null, id, false)}>
            <Button type="submit" variant="secondary">
              No, nessuno mi ha chiamato
            </Button>
          </form>
        </div>
      </section>
    );
  }

  if (lead.contacted) {
    return (
      <section className="mx-auto flex max-w-xl flex-col items-center gap-4 text-center">
        <h1 className="font-display text-h1">Grazie per averci risposto</h1>
        <p className="text-body-l text-ink-2">Ci fa piacere che {lead.partnerName} ti abbia ricontattato. Buon lavoro!</p>
        <Link href={searchHref} className="font-semibold text-primary underline">
          Torna alla ricerca
        </Link>
      </section>
    );
  }

  await connection();
  const alternatives = await alternativesTo(lead, 3);
  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-3 rounded-xl bg-brand-soft p-8">
        <h1 className="font-display text-h1">Ci dispiace, grazie per avercelo detto</h1>
        <p className="max-w-2xl text-body-l">
          {lead.partnerName} non ti ha ricontattato: ne terremo conto.{" "}
          {alternatives.length > 0
            ? `Intanto puoi chiedere un contatto ad altri ${lead.categoryPlural.toLowerCase()} della tua zona.`
            : `Puoi cercare altri ${lead.categoryPlural.toLowerCase()} nella ricerca.`}
        </p>
      </section>
      {alternatives.length > 0 && (
        <section aria-labelledby="alternative" className="flex flex-col gap-4">
          <h2 id="alternative" className="font-display text-h2">
            Altri {lead.categoryPlural.toLowerCase()} vicino a {lead.municipality}
          </h2>
          {alternatives.map((p) => (
            <PartnerCard key={p.id} p={p} />
          ))}
        </section>
      )}
      {backToSearch}
    </div>
  );
}
