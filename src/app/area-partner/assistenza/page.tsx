import { Suspense } from "react";
import Link from "next/link";
import { ChevronRight, Clock, Mail, MessageCircle, Phone } from "lucide-react";
import { PartnerPageHeader } from "@/components/partner/page-header";
import { PartnerSkeleton } from "@/components/partner/skeleton";
import { SupportTicketForm } from "@/components/partner/support-ticket-form";
import { TicketStatusPill } from "@/components/ui/ticket-status";
import { requirePartner } from "@/lib/auth/session";
import { listPartnerTickets } from "@/lib/data/support";
import { supportEmail } from "@/lib/support/service";

export const metadata = { title: "Aiuto" };

// Telefono e WhatsApp PROVVISORI: sostituire con quelli reali prima del lancio.
const SUPPORT = {
  phone: "+39 041 000 0000",
  whatsapp: "+39 340 000 0000",
  hours: "Lunedì–venerdì, 9:00–18:00",
};

const digits = (n: string) => n.replace(/[^\d+]/g, "");
const dateFmt = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" });

export default function SupportPage() {
  return (
    <Suspense fallback={<PartnerSkeleton />}>
      <Support />
    </Suspense>
  );
}

async function Support() {
  const { partner } = await requirePartner();
  const tickets = await listPartnerTickets(partner.id);
  const email = supportEmail();
  const subject = encodeURIComponent(`Assistenza: ${partner.displayName}`);
  const contacts = [
    { icon: Mail, label: "Email", value: email, href: `mailto:${email}?subject=${subject}` },
    { icon: Phone, label: "Telefono", value: SUPPORT.phone, href: `tel:${digits(SUPPORT.phone)}` },
    { icon: MessageCircle, label: "WhatsApp", value: SUPPORT.whatsapp, href: `https://wa.me/${digits(SUPPORT.whatsapp).replace("+", "")}` },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PartnerPageHeader title="Aiuto" subtitle="Siamo qui per aiutarti" partnerName={partner.displayName} logoUrl={partner.logoUrl} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-6">
          <section aria-labelledby="nuova-richiesta" className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-6">
            <div className="flex flex-col gap-1">
              <h2 id="nuova-richiesta" className="text-h3 font-semibold">
                Scrivi all&apos;assistenza
              </h2>
              <p className="text-body-s text-ink-2">Ti rispondiamo qui e per email entro un giorno lavorativo.</p>
            </div>
            <SupportTicketForm />
          </section>

          <section aria-labelledby="le-tue-richieste" className="rounded-lg border border-line bg-surface">
            <h2 id="le-tue-richieste" className="border-b border-line px-6 py-4 text-h4 font-semibold">
              Le tue richieste
            </h2>
            {tickets.length === 0 ? (
              <p className="p-8 text-center text-body-s text-ink-2">Le richieste che invii all&apos;assistenza compariranno qui.</p>
            ) : (
              <ul className="divide-y divide-line">
                {tickets.map((t) => (
                  <li key={t.number}>
                    <Link href={`/area-partner/assistenza/${t.number}`} className="flex items-center justify-between gap-3 px-6 py-3 hover:bg-subtle">
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate font-semibold">
                          #{t.number} · {t.subject}
                        </span>
                        <span className="text-caption text-ink-2">Ultimo messaggio {dateFmt.format(t.lastMessageAt)}</span>
                      </span>
                      <span className="flex items-center gap-2">
                        <TicketStatusPill status={t.status} audience="requester" />
                        <ChevronRight className="size-4 text-ink-3" aria-hidden />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="flex flex-col gap-6">
          <section aria-label="Contatti" className="flex flex-col gap-3">
            {contacts.map(({ icon: Icon, label, value, href }) => (
              <a key={label} href={href} className="flex flex-col gap-1 rounded-lg border border-line bg-surface p-4 hover:bg-subtle">
                <span className="inline-flex items-center gap-2 text-body-s text-ink-2">
                  <Icon className="size-4" aria-hidden /> {label}
                </span>
                <span className="font-semibold break-all">{value}</span>
              </a>
            ))}
            <p className="inline-flex items-center gap-2 text-body-s text-ink-2">
              <Clock className="size-4 shrink-0" aria-hidden /> {SUPPORT.hours}
            </p>
          </section>

          <section className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-5">
            <h2 className="text-h4 font-semibold">Domande frequenti</h2>
            <ul className="flex list-disc flex-col gap-2 pl-5 text-body-s">
              <li>
                Una richiesta non è valida? Segnalala entro 72 ore dalla pagina della{" "}
                <Link href="/area-partner/lead" className="font-semibold text-primary underline">
                  richiesta
                </Link>
                .
              </li>
              <li>
                Logo in Home e altre sponsorizzazioni: trovi tutto in{" "}
                <Link href="/area-partner/token" className="font-semibold text-primary underline">
                  Boost e sponsorizzazioni
                </Link>
                .
              </li>
              <li>
                Come ordiniamo i risultati:{" "}
                <Link href="/come-funziona" className="font-semibold text-primary underline">
                  Come funziona
                </Link>
                .
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
