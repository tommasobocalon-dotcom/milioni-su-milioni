import { Suspense } from "react";
import Link from "next/link";
import { Rocket } from "lucide-react";
import { connection } from "next/server";
import { setAutoUseTokens, simulateTokenPurchase } from "@/app/area-partner/actions";
import { BoostButtons } from "@/components/partner/boost-buttons";
import { PartnerPageHeader } from "@/components/partner/page-header";
import { PartnerSkeleton } from "@/components/partner/skeleton";
import { Geco } from "@/components/site/geco";
import { Button } from "@/components/ui/button";
import { requirePartner } from "@/lib/auth/session";
import { getLedger, getSubscription, getTokenBalance } from "@/lib/data/partner-area";
import { demoMode } from "@/lib/demo-mode";
import { formatEuro } from "@/lib/domain/format";
import { TOKEN_COST_PER_LEAD } from "@/lib/domain/lead-rules";
import { BOOST_OPTIONS, packageSaving, TOKEN_PACKAGES } from "@/lib/domain/offers";
import { cn } from "@/lib/utils";

export const metadata = { title: "Token e boost" };

const dateFmt = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Rome" });
const KIND: Record<string, string> = { purchase: "Acquisto", credit: "Accredito", consume: "Consumo", expire: "Scadenza", refund: "Rimborso" };

export default function TokenPage() {
  return (
    <Suspense fallback={<PartnerSkeleton />}>
      <Tokens />
    </Suspense>
  );
}

async function Tokens() {
  const { partner, memberRole } = await requirePartner();
  await connection();
  const now = new Date();
  const [balance, ledger, sub] = await Promise.all([getTokenBalance(partner.id, now), getLedger(partner.id), getSubscription(partner.id)]);
  const dev = demoMode();

  return (
    <div className="flex flex-col gap-6">
      <PartnerPageHeader
        title="Token e boost"
        subtitle="Crediti prepagati per lead oltre quota, boost e vetrina. Validi 12 mesi."
        partnerName={partner.displayName} logoUrl={partner.logoUrl}
        planCode={sub?.planCode}
      />

      <div className="grid gap-6 xl:grid-cols-[340px_1fr]">
        <section className="flex flex-col gap-4 rounded-lg bg-brand p-6 text-on-brand">
          <div className="flex items-start justify-between">
            <div>
              <p className="caps-label text-on-brand-muted">Saldo disponibile</p>
              <p className="font-display text-display-xl">{balance}</p>
              <p className="text-body-s text-on-brand-muted">≈ {Math.floor(balance / TOKEN_COST_PER_LEAD)} lead oltre quota</p>
            </div>
            <Geco outfit="token" size={96} />
          </div>
          <form action={setAutoUseTokens} className="flex flex-col gap-2 rounded-md bg-bosco-800 p-4">
            <label className="flex items-start gap-3 text-body-s">
              <input
                type="checkbox"
                name="auto"
                defaultChecked={sub?.autoUseTokens}
                disabled={memberRole !== "owner"}
                className="mt-0.5 size-5 accent-salvia-300"
              />
              <span>Usa automaticamente i token per i lead oltre quota ({TOKEN_COST_PER_LEAD} token ciascuno)</span>
            </label>
            <Button type="submit" variant="light" size="s" disabled={memberRole !== "owner"}>
              Salva preferenza
            </Button>
            <p className="text-caption text-on-brand-muted">Se disattivato, i lead oltre quota restano nascosti per 48 ore e puoi sbloccarli tu.</p>
          </form>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-h3 font-semibold">Acquista un pacchetto</h2>
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
                    {p.tokens} <span className="text-body text-ink-2">token</span>
                  </p>
                  <p className="text-body-s">{formatEuro(p.priceCents)} + IVA</p>
                  {dev ? (
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
            {dev
              ? "Ambiente di prova: l'acquisto accredita i token senza pagamento. In produzione il pagamento passa da Stripe Checkout e arriva la fattura elettronica."
              : "Pagamento anticipato con Stripe, fattura elettronica emessa all'acquisto."}
          </p>
        </section>
      </div>

      <section className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-6">
        <h2 className="inline-flex items-center gap-2 text-h3 font-semibold">
          <Rocket className="size-5" aria-hidden /> Boost della scheda
        </h2>
        <p className="text-body-s text-ink-2">
          Posizione sponsorizzata in cima ai risultati per la tua categoria e provincia, sempre etichettata come
          &quot;Sponsorizzato&quot;.
        </p>
        <BoostButtons options={BOOST_OPTIONS} balance={balance} />
        <p className="text-caption text-ink-2">
          Vale per la tua categoria nella tua provincia. Se hai già un boost attivo, il nuovo parte alla sua scadenza. I risultati li trovi in{" "}
          <Link href="/area-partner/statistiche" className="font-semibold text-primary underline">
            Statistiche
          </Link>
          .
        </p>
      </section>

      <section className="rounded-lg border border-line bg-surface">
        <h2 className="p-5 text-h4 font-semibold">Movimenti</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-body-s">
            <thead className="bg-subtle text-caption text-ink-2">
              <tr>
                <th className="px-5 py-2 font-semibold">Data</th>
                <th className="px-5 py-2 font-semibold">Descrizione</th>
                <th className="px-5 py-2 font-semibold">Tipo</th>
                <th className="px-5 py-2 text-right font-semibold">Token</th>
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
          Registro immutabile: il saldo è sempre ricostruibile. I token non sono convertibili in denaro; si consumano prima quelli che
          scadono prima.
        </p>
      </section>
    </div>
  );
}
