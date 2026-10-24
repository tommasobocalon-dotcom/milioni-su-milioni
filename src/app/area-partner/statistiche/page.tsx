import { Suspense } from "react";
import { Eye, Inbox, MousePointerClick, Rocket, Search } from "lucide-react";
import { connection } from "next/server";
import { Kpi } from "@/components/partner/kpi";
import { PartnerPageHeader } from "@/components/partner/page-header";
import { PartnerSkeleton } from "@/components/partner/skeleton";
import { ButtonLink } from "@/components/ui/button";
import { requirePartner } from "@/lib/auth/session";
import { getPartnerStats, rate, STATS_DAYS } from "@/lib/data/stats";

export const metadata = { title: "Statistiche" };

const dateFmt = new Intl.DateTimeFormat("it-IT", {
  day: "numeric",
  month: "short",
  timeZone: "Europe/Rome",
});

export default function StatsPage() {
  return (
    <Suspense fallback={<PartnerSkeleton />}>
      <Stats />
    </Suspense>
  );
}

async function Stats() {
  const { partner } = await requirePartner();
  await connection();
  const s = await getPartnerStats(partner.id, new Date());
  const active = s.boosts.find((b) => b.active);

  return (
    <div className="flex flex-col gap-6">
      <PartnerPageHeader
        title="Statistiche"
        subtitle={`Come sta andando la tua scheda negli ultimi ${STATS_DAYS} giorni`}
        partnerName={partner.displayName}
        logoUrl={partner.logoUrl}
      />

      <section aria-label="Indicatori" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={Search} label="Comparse nei risultati" value={String(s.impressions)} note="Quante volte sei apparso in una ricerca" />
        <Kpi icon={Eye} label="Visite alla scheda" value={String(s.views)} note={`${rate(s.views, s.impressions)}% di chi ti ha visto`} />
        <Kpi
          icon={MousePointerClick}
          label="Clic su «Richiedi contatto»"
          value={String(s.contactClicks)}
          note={`${rate(s.contactClicks, s.views)}% delle visite`}
        />
        <Kpi
          icon={Inbox}
          label="Richieste ricevute"
          value={String(s.leads)}
          note={`${rate(s.leads, s.contactClicks)}% dei moduli aperti`}
        />
      </section>

      <section className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="inline-flex items-center gap-2 text-h3 font-semibold">
            <Rocket className="size-5" aria-hidden /> Promozione con i token
          </h2>
          <ButtonLink href="/area-partner/token" size="s">
            {active ? "Allunga il boost" : "Attiva un boost"}
          </ButtonLink>
        </div>
        <p className="text-body-s text-ink-2">
          {active
            ? `Boost attivo fino al ${dateFmt.format(active.endsAt)}: compari tra i primi risultati, etichettato come "Sponsorizzato".`
            : 'Con un boost compari tra i primi risultati della tua categoria nella tua provincia, sempre etichettato come "Sponsorizzato".'}
        </p>
        {s.boosts.length > 0 && (
          <table className="w-full text-left text-body-s">
            <thead className="text-caption text-ink-2">
              <tr>
                <th className="py-2 font-medium">Periodo</th>
                <th className="py-2 font-medium">Token spesi</th>
                <th className="py-2 font-medium">Stato</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {s.boosts.map((b) => (
                <tr key={b.id}>
                  <td className="py-2">
                    {dateFmt.format(b.startsAt)} – {dateFmt.format(b.endsAt)}
                  </td>
                  <td className="py-2">{b.tokensSpent}</td>
                  <td className="py-2">{b.active ? "Attivo" : b.startsAt > new Date() ? "Programmato" : "Concluso"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
