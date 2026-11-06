import { Suspense } from "react";
import { eq } from "drizzle-orm";
import { ExternalLink, Pencil } from "lucide-react";
import { PartnerPageHeader } from "@/components/partner/page-header";
import { PartnerSkeleton } from "@/components/partner/skeleton";
import { ButtonLink } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { LogoPartner } from "@/components/ui/logo-partner";
import { requirePartner } from "@/lib/auth/session";
import { getPartnerProfile } from "@/lib/data/partners";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";

export const metadata = { title: "Profilo" };

export default function ProfilePage() {
  return (
    <Suspense fallback={<PartnerSkeleton />}>
      <Profile />
    </Suspense>
  );
}

/** Riga etichetta/valore; il valore mancante si vede come tale, così il partner sa cosa completare. */
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
      <dt className="text-ink-2 sm:w-44 sm:shrink-0">{label}</dt>
      <dd className="min-w-0 break-words">{children || <span className="text-ink-2">Non indicato</span>}</dd>
    </div>
  );
}

async function Profile() {
  const { user, partner, memberRole } = await requirePartner();
  const [p, [u]] = await Promise.all([
    getPartnerProfile(partner.slug),
    db.select({ avatarUrl: users.avatarUrl }).from(users).where(eq(users.id, user.id)),
  ]);
  if (!p) return null;

  return (
    <div className="flex flex-col gap-6">
      <PartnerPageHeader title="Profilo" subtitle="I tuoi dati e quelli della tua azienda" partnerName={partner.displayName} logoUrl={partner.logoUrl} />
      <div className="flex flex-wrap gap-3">
        <ButtonLink href="/area-partner/profilo/modifica">
          <Pencil aria-hidden /> Modifica profilo
        </ButtonLink>
        <ButtonLink href={p.href} variant="secondary" target="_blank">
          Vedi la scheda pubblica <ExternalLink aria-hidden />
        </ButtonLink>
      </div>

      <section aria-labelledby="titolare" className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-6">
        <h2 id="titolare" className="text-h3 font-semibold">
          Titolare
        </h2>
        <div className="flex items-center gap-4">
          <LogoPartner name={user.name} src={u?.avatarUrl} size={64} className="rounded-full" />
          <div className="flex flex-col">
            <p className="text-body font-semibold">{user.name}</p>
            <p className="text-body-s text-ink-2">
              {user.email} · {memberRole === "owner" ? "titolare dell'account" : "collaboratore"}
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="azienda" className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-6">
        <h2 id="azienda" className="text-h3 font-semibold">
          Azienda
        </h2>
        <div className="flex items-center gap-4">
          <LogoPartner name={p.displayName} src={p.logoUrl} size={64} />
          <div className="flex flex-col">
            <p className="text-body font-semibold">{p.displayName}</p>
            <p className="text-body-s text-ink-2">
              {p.categoryName} · {p.municipalityName} ({p.provinceCode})
            </p>
          </div>
        </div>
        <dl className="flex flex-col gap-3 text-body-s">
          <Row label="Ragione sociale">{p.businessName}</Row>
          <Row label="Partita IVA">{p.vatNumber}</Row>
          <Row label="Sede legale">{p.address}</Row>
          <Row label="Telefono">{p.phone}</Row>
          <Row label="Email per gli avvisi">{p.email}</Row>
          <Row label="Contatti sulla scheda">{p.hideDirectContacts ? "Nascosti: i clienti scrivono dal modulo" : "Visibili"}</Row>
        </dl>
      </section>

      <section aria-labelledby="presentazione" className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-6">
        <h2 id="presentazione" className="text-h3 font-semibold">
          Presentazione
        </h2>
        <dl className="flex flex-col gap-3 text-body-s">
          <Row label="Frase di presentazione">{p.tagline}</Row>
          <Row label="Descrizione">
            <span className="whitespace-pre-line">{p.description}</span>
          </Row>
          <Row label="Specializzazioni">
            {p.specialties.length > 0 && (
              <span className="flex flex-wrap gap-2">
                {p.specialties.map((s) => (
                  <Chip key={s} selected>
                    {s}
                  </Chip>
                ))}
              </span>
            )}
          </Row>
          <Row label="Anno di fondazione">{p.foundedYear}</Row>
          <Row label="Orari">
            {p.openingHours.length > 0 && (
              <span className="flex flex-col">
                {p.openingHours.map((h) => (
                  <span key={h.label}>
                    {h.label}: {h.value}
                  </span>
                ))}
              </span>
            )}
          </Row>
        </dl>
      </section>
    </div>
  );
}
