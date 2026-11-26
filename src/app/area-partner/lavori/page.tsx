import { Suspense } from "react";
import { ExternalLink } from "lucide-react";
import { PartnerPageHeader } from "@/components/partner/page-header";
import { PortfolioManager } from "@/components/partner/portfolio-manager";
import { PartnerSkeleton } from "@/components/partner/skeleton";
import { ButtonLink } from "@/components/ui/button";
import { requirePartner } from "@/lib/auth/session";
import { getSubscription } from "@/lib/data/partner-area";
import { getPartnerProfile } from "@/lib/data/partners";

export const metadata = { title: "Lavori e foto" };

/** Posto unico dove l'azienda pubblica i suoi lavori (o immobili) con foto e descrizione: vanno nella scheda e, se lo sceglie, in Ispirazione. */
export default function WorksPage() {
  return (
    <Suspense fallback={<PartnerSkeleton />}>
      <Works />
    </Suspense>
  );
}

async function Works() {
  const { partner } = await requirePartner();
  const [p, sub] = await Promise.all([getPartnerProfile(partner.slug), getSubscription(partner.id)]);
  if (!p) return null;
  const isAgency = partner.type === "agency";
  return (
    <div className="flex flex-col gap-6">
      <PartnerPageHeader
        title="Lavori e foto"
        subtitle={isAgency ? "Pubblica i tuoi immobili con foto e descrizione" : "Pubblica i lavori che hai fatto con foto e descrizione"}
        partnerName={partner.displayName}
        logoUrl={partner.logoUrl}
        planCode={sub?.planCode}
      />
      <section className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-6">
        <h2 className="text-h4 font-semibold">Come funziona</h2>
        <ol className="flex list-decimal flex-col gap-1 pl-5 text-body">
          <li>Scegli da 2 a 8 foto {isAgency ? "dell'immobile" : "del lavoro"}: la prima è quella principale.</li>
          <li>Scrivi un titolo e una breve descrizione (fino a 300 caratteri).</li>
          <li>
            Premi &quot;Pubblica&quot;: compare subito nella tua scheda pubblica. Spunta &quot;Mostra anche nella pagina Ispirazione&quot; se vuoi che lo vedano anche lì,
            dove i clienti ti chiedono un contatto.
          </li>
        </ol>
        <div className="flex flex-wrap gap-2 pt-1">
          <ButtonLink href="/ispirazione" variant="secondary" size="s" target="_blank">
            Vedi Ispirazione <ExternalLink aria-hidden />
          </ButtonLink>
          <ButtonLink href={p.href} variant="secondary" size="s" target="_blank">
            Vedi la scheda pubblica <ExternalLink aria-hidden />
          </ButtonLink>
        </div>
      </section>
      <PortfolioManager partnerId={partner.id} isAgency={isAgency} defaultPlaceId={p.municipalityId} />
    </div>
  );
}
