import { Suspense } from "react";
import { ExternalLink } from "lucide-react";
import { ComingSoon } from "@/components/partner/coming-soon";
import { PartnerPageHeader } from "@/components/partner/page-header";
import { PartnerSkeleton } from "@/components/partner/skeleton";
import { ButtonLink } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { requirePartner } from "@/lib/auth/session";
import { getSubscription } from "@/lib/data/partner-area";
import { getPartnerProfile } from "@/lib/data/partners";

export const metadata = { title: "La mia scheda" };

export default function ProfileEditorPage() {
  return (
    <Suspense fallback={<PartnerSkeleton />}>
      <Profile />
    </Suspense>
  );
}

async function Profile() {
  const { partner } = await requirePartner();
  const [p, sub] = await Promise.all([getPartnerProfile(partner.slug), getSubscription(partner.id)]);
  if (!p) return null;
  return (
    <div className="flex flex-col gap-6">
      <PartnerPageHeader title="La mia scheda" subtitle="Così ti vedono i clienti" partnerName={partner.displayName} planCode={sub?.planCode} />
      <section className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-h3 font-semibold">{p.displayName}</h2>
          <ButtonLink href={p.href} variant="secondary" size="s" target="_blank">
            Vedi la scheda pubblica <ExternalLink aria-hidden />
          </ButtonLink>
        </div>
        <p className="text-body-s text-ink-2">
          {p.categoryName} · {p.tagline}
        </p>
        <p className="text-body">{p.description}</p>
        <div className="flex flex-wrap gap-2">
          {p.specialties.map((s) => (
            <Chip key={s} selected>
              {s}
            </Chip>
          ))}
        </div>
        <p className="text-body-s">
          <span className="font-semibold">Zone servite:</span> {p.areas.join(", ")}
        </p>
      </section>
      <ComingSoon
        title="Modifica della scheda"
        items={[
          "descrizione, logo, copertina, orari e contatti con anteprima prima di salvare",
          "categoria, servizi e zone servite entro i limiti del piano",
          "indicatore di completezza con i consigli del geco",
          "collaboratori con accesso limitato",
        ]}
      />
    </div>
  );
}
