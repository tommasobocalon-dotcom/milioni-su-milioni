import { Suspense } from "react";
import Link from "next/link";
import { MapPinPlus, Rocket, Sparkles } from "lucide-react";
import { connection } from "next/server";
import { simulateTokenPurchase, startTokenCheckout } from "@/app/area-partner/actions";
import { CheckoutButton, PaymentNotice } from "@/components/partner/checkout-button";
import { BoostButtons } from "@/components/partner/boost-buttons";
import { AreaExtensionForm, ShowcaseForm } from "@/components/partner/extra-forms";
import { PartnerPageHeader } from "@/components/partner/page-header";
import { PartnerSkeleton } from "@/components/partner/skeleton";
import { Geco } from "@/components/site/geco";
import { Button } from "@/components/ui/button";
import { requirePartner } from "@/lib/auth/session";
import { stripeConfigured } from "@/lib/billing/stripe";
import { getExtras, getLedger, getSubscription, getTokenBalance } from "@/lib/data/partner-area";
import { demoMode } from "@/lib/demo-mode";
import { formatEuro } from "@/lib/domain/format";
import { canBoost } from "@/lib/domain/ranking";
import { AREA_EXTENSION, BOOST_OPTIONS, packageSaving, SHOWCASE_OPTIONS, TOKEN_PACKAGES } from "@/lib/domain/offers";
import { cn } from "@/lib/utils";

export const metadata = { title: "Crediti" };

const dateFmt = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Rome" });
const KIND: Record<string, string> = { purchase: "Acquisto", credit: "Accredito", consume: "Consumo", expire: "Scadenza", refund: "Rimborso" };

export default function TokenPage({ searchParams }: PageProps<"/area-partner/token">) {
  return (
    <Suspense fallback={<PartnerSkeleton />}>
      {searchParams.then((sp) => (
        <Tokens paid={sp.pagamento === "ok"} />
      ))}
    </Suspense>
  );
}

async function Tokens({ paid }: { paid: boolean }) {
  const { partner, memberRole } = await requirePartner();
  await connection();
  const now = new Date();
  const [balance, ledger, sub, extras] = await Promise.all([
    getTokenBalance(partner.id, now),
    getLedger(partner.id),
    getSubscription(partner.id),
    getExtras(partner.id, now),
  ]);
  const dev = demoMode();
  const stripeOn = stripeConfigured();
  const canUseTokens = !!sub && canBoost(sub.planWeight);

  return (
    <div className="flex flex-col gap-6">
      <PartnerPageHeader
        title="Crediti"
        subtitle="Servono per il boost, per una provincia vicina e per la vetrina Ispirazione. Valgono 12 mesi."
        partnerName={partner.displayName} logoUrl={partner.logoUrl}
        planCode={sub?.planCode}
      />

      {paid && <PaymentNotice>I crediti compaiono nel saldo appena Stripe conferma il pagamento: con la carta in pochi secondi, con l&apos;addebito SEPA in qualche giorno lavorativo.</PaymentNotice>}

      <div className="grid gap-6 xl:grid-cols-[340px_1fr]">
        <section className="flex flex-col gap-4 rounded-lg bg-brand p-6 text-on-brand">
          <div className="flex items-start justify-between">
            <div>
              <p className="caps-label text-on-brand-muted">Saldo disponibile</p>
              <p className="font-display text-display-xl">{balance}</p>
              {sub?.renewalTokens ? (
                <p className="text-body-s text-on-brand-muted">Il piano {sub.planName} ne aggiunge {sub.renewalTokens} ogni mese</p>
              ) : null}
            </div>
            <Geco outfit="token" size={96} />
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-h3 font-semibold">Compra crediti</h2>
          {!canUseTokens ? (
            <p className="rounded-md bg-subtle p-4 text-body-s">
              I crediti sono inclusi nei piani Normal e Premium: con il piano Base non si comprano.{" "}
              <Link href="/area-partner/abbonamento" className="font-semibold text-primary underline">
                Cambia piano
              </Link>
            </p>
          ) : (
          <>
          <ul className="grid gap-4 md:grid-cols-3">
            {TOKEN_PACKAGES.map((p) => {
              const saving = packageSaving(p.tokens, p.priceCents);
              return (
                <li
                  key={p.code}
                  className={cn(
                    "flex flex-col gap-3 rounded-lg border bg-surface p-5",
                    "highlight" in p && p.highlight ? "border-primary bg-subtle" : "border-line",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <p className="caps-label text-ink-2">{p.name}</p>
                    {saving > 0 && <span className="rounded-full bg-ambra-100 px-2 py-0.5 text-caption font-semibold">−{saving}%</span>}
                  </div>
                  <p className="font-display text-h1">
                    {p.tokens} <span className="text-body text-ink-2">crediti</span>
                  </p>
                  <p className="text-body-s">{formatEuro(p.priceCents)} + IVA</p>
                  {stripeOn ? (
                    <CheckoutButton
                      action={startTokenCheckout.bind(null, p.code)}
                      size="s"
                      variant={"highlight" in p && p.highlight ? "primary" : "secondary"}
                      className="w-full"
                      disabled={memberRole !== "owner"}
                    >
                      Acquista
                    </CheckoutButton>
                  ) : dev ? (
                    <form action={simulateTokenPurchase.bind(null, p.code)}>
                      <Button type="submit" size="s" variant={"highlight" in p && p.highlight ? "primary" : "secondary"} className="w-full">
                        Simula acquisto
                      </Button>
                    </form>
                  ) : (
                    <Button size="s" disabled>
                      Acquista
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
          <p className="text-caption text-ink-2">
            {!stripeOn && dev
              ? "Ambiente di prova: l'acquisto accredita i crediti senza pagamento. Con Stripe configurato il pagamento passa dal Checkout di Stripe, con ricevuta via email."
              : "Pagamento anticipato con Stripe (carta o addebito SEPA), con ricevuta via email."}
          </p>
          </>
          )}
        </section>
      </div>

      <section className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-6">
        <h2 className="inline-flex items-center gap-2 text-h3 font-semibold">
          <Rocket className="size-5" aria-hidden /> Boost: più visibilità per qualche ora
        </h2>
        <p className="text-body-s text-ink-2">
          Due boost separati, sempre etichettati come &quot;Sponsorizzato&quot;: in cima alla ricerca (prima degli altri con il tuo stesso
          piano, mai sopra un piano più alto) oppure con il tuo logo nella fascia Aziende in evidenza della Home.
        </p>
        {canUseTokens ? (
          <BoostButtons options={BOOST_OPTIONS} balance={balance} />
        ) : (
          <p className="rounded-md bg-subtle p-4 text-body-s">
            Il boost è incluso nei piani Normal e Premium.{" "}
            <Link href="/area-partner/abbonamento" className="font-semibold text-primary underline">
              Cambia piano
            </Link>
          </p>
        )}
        <p className="text-caption text-ink-2">
          Il boost nella ricerca vale per la tua categoria nella tua provincia. Se un boost dello stesso tipo è già attivo, il nuovo periodo parte quando finisce quello attuale. I risultati li trovi in{" "}
          <Link href="/area-partner/statistiche" className="font-semibold text-primary underline">
            Statistiche
          </Link>
          .
        </p>
      </section>

      {canUseTokens && (
        <div className="grid gap-6 xl:grid-cols-2">
          <section className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-6">
            <h2 className="inline-flex items-center gap-2 text-h3 font-semibold">
              <MapPinPlus className="size-5" aria-hidden /> Lavora anche in una provincia vicina
            </h2>
            <p className="text-body-s text-ink-2">
              Per {AREA_EXTENSION.days} giorni la tua scheda compare anche nelle ricerche di una provincia confinante.{" "}
              {AREA_EXTENSION.tokens} crediti per provincia.
            </p>
            <AreaExtensionForm neighbours={extras.neighbours} tokens={AREA_EXTENSION.tokens} days={AREA_EXTENSION.days} balance={balance} />
          </section>
          <section className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-6">
            <h2 className="inline-flex items-center gap-2 text-h3 font-semibold">
              <Sparkles className="size-5" aria-hidden /> Un tuo lavoro in Ispirazione
            </h2>
            <p className="text-body-s text-ink-2">
              Il lavoro compare in cima alla pagina{" "}
              <Link href="/ispirazione" className="font-semibold text-primary underline">
                Ispirazione
              </Link>
              , dove i clienti cercano idee, con la scritta &quot;Sponsorizzato&quot;.
            </p>
            <ShowcaseForm items={extras.items} options={SHOWCASE_OPTIONS} balance={balance} />
          </section>
        </div>
      )}

      <section className="rounded-lg border border-line bg-surface">
        <h2 className="p-5 text-h4 font-semibold">Movimenti</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-body-s">
            <thead className="bg-subtle text-caption text-ink-2">
              <tr>
                <th className="px-5 py-2 font-semibold">Data</th>
                <th className="px-5 py-2 font-semibold">Descrizione</th>
                <th className="px-5 py-2 font-semibold">Tipo</th>
                <th className="px-5 py-2 text-right font-semibold">Crediti</th>
                <th className="px-5 py-2 font-semibold">Scadenza</th>
              </tr>
            </thead>
            <tbody>
              {ledger.map((r) => (
                <tr key={r.id} className="border-t border-line">
                  <td className="px-5 py-3 text-ink-2">{dateFmt.format(r.createdAt)}</td>
                  <td className="px-5 py-3">{r.reference}</td>
                  <td className="px-5 py-3">{KIND[r.kind]}</td>
                  <td className={cn("px-5 py-3 text-right font-semibold tabular-nums", r.amount > 0 ? "text-success" : "text-ink")}>
                    {r.amount > 0 ? `+${r.amount}` : r.amount}
                  </td>
                  <td className="px-5 py-3 text-ink-2">{r.expiresAt ? dateFmt.format(r.expiresAt) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="border-t border-line px-5 py-4 text-caption text-ink-2">
          I crediti non si convertono in denaro. Si usano prima quelli che scadono prima.
        </p>
      </section>
    </div>
  );
}
