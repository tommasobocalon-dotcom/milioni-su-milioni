import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Mail } from "lucide-react";
import { SupportForm } from "@/components/site/support-form";
import { getAnySessionUser } from "@/lib/auth/session";
import { supportEmail } from "@/lib/support/service";

export const metadata: Metadata = {
  title: "Assistenza",
  description: "Scrivi al team di geco: ti rispondiamo per email entro un giorno lavorativo.",
};

const QUICK = [
  { q: "Ho inviato una richiesta a un professionista", a: "Ti ricontatta lui nella fascia oraria che hai scelto. Se non succede entro due giorni, scrivici." },
  { q: "Sono un'azienda e voglio comparire su geco", a: "Registrati da Per i professionisti: scegli il piano e la tua scheda è online appena il piano è attivo." },
  { q: "Un lead non è valido", a: "Segnalalo entro 72 ore dalla pagina del lead nell'Area Partner: lo controlliamo noi." },
];

export default function SupportPage() {
  return (
    // Su telefono: presentazione, modulo, domande frequenti. Da desktop le domande stanno sotto la presentazione.
    <div className="container-page grid gap-10 py-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] lg:grid-rows-[auto_1fr] lg:gap-x-16 lg:gap-y-8">
      <div className="flex flex-col gap-6 lg:col-start-1">
        <div className="flex items-end gap-4">
          <h1 className="font-display text-h1">Come ti aiutiamo?</h1>
        </div>
        <p className="text-body-l text-neutro-700">
          Scrivici qui sotto: la richiesta arriva al team di geco e ti rispondiamo per email entro un giorno lavorativo.
        </p>
        <p className="inline-flex flex-wrap items-center gap-2 text-body-s text-ink-2">
          <Mail className="size-4" aria-hidden /> Preferisci l&apos;email? Scrivi a{" "}
          <a href={`mailto:${supportEmail()}`} className="font-semibold text-primary underline">
            {supportEmail()}
          </a>
        </p>
      </div>

      <section aria-label="Scrivi all'assistenza" className="rounded-xl border border-line bg-surface p-6 sm:p-8 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start">
        <Suspense fallback={<SupportForm user={null} />}>
          <FormWithSession />
        </Suspense>
      </section>

      <section aria-labelledby="domande" className="flex flex-col gap-4 border-t border-line pt-6 lg:col-start-1">
        <h2 id="domande" className="text-h4 font-semibold">
          Prima di scriverci
        </h2>
        <dl className="flex flex-col gap-4">
          {QUICK.map(({ q, a }) => (
            <div key={q} className="flex flex-col gap-1">
              <dt className="text-body-s font-semibold">{q}</dt>
              <dd className="text-body-s text-ink-2">{a}</dd>
            </div>
          ))}
        </dl>
        <p className="text-body-s">
          Con quali criteri ordiniamo i risultati e cosa è sponsorizzato:{" "}
          <Link href="/come-ordiniamo-i-risultati" className="font-semibold text-primary underline">
            Come ordiniamo i risultati
          </Link>
          .
        </p>
      </section>
    </div>
  );
}

/** Chi è entrato trova nome ed email già compilati. */
async function FormWithSession() {
  const user = await getAnySessionUser();
  return <SupportForm user={user ? { name: user.name, email: user.email } : null} />;
}
