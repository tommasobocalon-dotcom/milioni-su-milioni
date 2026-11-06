import { Suspense } from "react";
import { ExternalLink } from "lucide-react";
import { ComingSoon } from "@/components/partner/coming-soon";
import { PartnerPageHeader } from "@/components/partner/page-header";
import { PortfolioManager } from "@/components/partner/portfolio-manager";
import { PartnerSkeleton } from "@/components/partner/skeleton";
import { GoogleLink, GoogleUnlinkButton } from "@/components/partner/google-link";
import { ButtonLink } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { requirePartner } from "@/lib/auth/session";
import { getSubscription } from "@/lib/data/partner-area";
import { getPartnerProfile } from "@/lib/data/partners";
import { formatRating } from "@/lib/domain/format";
import { getGoogleReviews, googlePlacesEnabled } from "@/lib/google/places";

export const metadata = { title: "Scheda pubblica" };

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
      <PartnerPageHeader title="Scheda pubblica" subtitle="Così ti vedono i clienti" partnerName={partner.displayName} logoUrl={partner.logoUrl} planCode={sub?.planCode} />
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
      <GoogleReviewsCard placeId={p.googlePlaceId} defaultQuery={`${p.displayName} ${p.municipalityName}`} href={p.href} />
      <PortfolioManager partnerId={partner.id} isAgency={partner.type === "agency"} />
      <ComingSoon
        title="Prossimamente"
        items={[
          "copertina (logo, dati aziendali, descrizione, specializzazioni e orari si modificano in Profilo)",
          "categoria, servizi e zone servite entro i limiti del piano",
          "indicatore di completezza con i consigli per migliorare la scheda",
          "collaboratori con accesso limitato",
        ]}
      />
    </div>
  );
}

/** Collegamento alla scheda Google Maps: da lì arrivano le recensioni mostrate sulla scheda pubblica. */
async function GoogleReviewsCard({ placeId, defaultQuery, href }: { placeId: string | null; defaultQuery: string; href: string }) {
  const linked = placeId ? await getGoogleReviews(placeId) : null;
  return (
    <section aria-labelledby="google-titolo" className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-6">
      <div className="flex flex-col gap-1">
        <h2 id="google-titolo" className="text-h3 font-semibold">
          Recensioni Google
        </h2>
        <p className="text-body-s text-ink-2">
          Collega la tua scheda Google Maps: voto e ultime recensioni compaiono sulla tua scheda geco, con il link a Google.
        </p>
      </div>
      {!googlePlacesEnabled() ? (
        <p className="rounded-md bg-subtle p-3 text-body-s text-ink-2">Il collegamento con Google non è ancora attivo: torna presto.</p>
      ) : placeId ? (
        <div className="flex flex-col gap-3 rounded-md bg-subtle p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-body-s">
            {linked ? (
              <>
                Collegata: <strong>{formatRating(linked.rating)} su 5</strong> con {linked.count.toLocaleString("it-IT")} recensioni.{" "}
                <a href={`${href}#recensioni-google`} target="_blank" className="font-semibold text-primary underline">
                  Vedi sulla scheda
                </a>
              </>
            ) : (
              "Scheda Google collegata, ma per ora Google non ha voti da mostrare."
            )}
          </p>
          <GoogleUnlinkButton />
        </div>
      ) : (
        <GoogleLink defaultQuery={defaultQuery} />
      )}
    </section>
  );
}
