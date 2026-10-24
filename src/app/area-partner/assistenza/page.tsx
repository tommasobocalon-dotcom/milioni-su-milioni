import { Suspense } from "react";
import Link from "next/link";
import { Clock, Mail, MessageCircle, Phone } from "lucide-react";
import { PartnerPageHeader } from "@/components/partner/page-header";
import { PartnerSkeleton } from "@/components/partner/skeleton";
import { requirePartner } from "@/lib/auth/session";

export const metadata = { title: "Assistenza" };

// Contatti PROVVISORI: sostituire con quelli reali prima del lancio.
const SUPPORT = {
  email: "assistenza@geco.example",
  phone: "+39 041 000 0000",
  whatsapp: "+39 340 000 0000",
  hours: "Lunedì–venerdì, 9:00–18:00",
};

const digits = (n: string) => n.replace(/[^\d+]/g, "");

export default function SupportPage() {
  return (
    <Suspense fallback={<PartnerSkeleton />}>
      <Support />
    </Suspense>
  );
}

async function Support() {
  const { partner } = await requirePartner();
  const subject = encodeURIComponent(`Assistenza: ${partner.displayName}`);
  const contacts = [
    {
      icon: Mail,
      label: "Email",
      value: SUPPORT.email,
      href: `mailto:${SUPPORT.email}?subject=${subject}`,
    },
    {
      icon: Phone,
      label: "Telefono",
      value: SUPPORT.phone,
      href: `tel:${digits(SUPPORT.phone)}`,
    },
    {
      icon: MessageCircle,
      label: "WhatsApp",
      value: SUPPORT.whatsapp,
      href: `https://wa.me/${digits(SUPPORT.whatsapp).replace("+", "")}`,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PartnerPageHeader title="Assistenza" subtitle="Siamo qui per aiutarti" partnerName={partner.displayName} logoUrl={partner.logoUrl} />

      <section aria-label="Contatti" className="grid gap-4 sm:grid-cols-3">
        {contacts.map(({ icon: Icon, label, value, href }) => (
          <a key={label} href={href} className="flex flex-col gap-2 rounded-lg border border-line bg-surface p-5 hover:bg-subtle">
            <span className="inline-flex items-center gap-2 text-body-s text-ink-2">
              <Icon className="size-4" aria-hidden /> {label}
            </span>
            <span className="font-semibold break-all">{value}</span>
          </a>
        ))}
      </section>

      <p className="inline-flex items-center gap-2 text-body-s text-ink-2">
        <Clock className="size-4" aria-hidden /> {SUPPORT.hours}. Rispondiamo alle email entro un giorno lavorativo.
      </p>

      <section className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-6">
        <h2 className="text-h3 font-semibold">Domande frequenti</h2>
        <ul className="flex list-disc flex-col gap-2 pl-5 text-body-s">
          <li>
            Un lead non è valido? Segnalalo entro 72 ore dalla pagina del{" "}
            <Link href="/area-partner/lead" className="font-semibold text-primary underline">
              lead
            </Link>
            .
          </li>
          <li>
            Token, boost e lead oltre quota: trovi tutto in{" "}
            <Link href="/area-partner/token" className="font-semibold text-primary underline">
              Token e boost
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
  );
}
