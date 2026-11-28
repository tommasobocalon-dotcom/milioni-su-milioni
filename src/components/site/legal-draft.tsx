import { slugify } from "@/lib/domain/format";
import { LEGAL_UPDATED } from "@/lib/domain/legal";

export function LegalDraft({
  title,
  intro,
  sections,
  children,
}: {
  title: string;
  /** Riquadro in evidenza sotto il titolo (es. "In breve"). */
  intro?: React.ReactNode;
  /** Testo semplice oppure paragrafi ed elenchi già composti. */
  sections: [heading: string, content: React.ReactNode][];
  /** Sezioni in più dopo quelle di testo (es. i crediti in Termini). */
  children?: React.ReactNode;
}) {
  return (
    <div className="container-page flex max-w-3xl flex-col gap-8 py-12">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-h1">{title}</h1>
        <p className="text-body-s text-ink-2">Ultimo aggiornamento: {LEGAL_UPDATED}</p>
      </div>
      <p className="flex items-center gap-3 rounded-md bg-ambra-100 p-4 text-body-s">
        Testo provvisorio: la versione definitiva, con i dati della società che gestisce il sito, sarà pubblicata prima dell&apos;apertura al pubblico.
      </p>
      {intro && <div className="flex flex-col gap-2 rounded-lg border border-line bg-surface p-5 text-body">{intro}</div>}
      {sections.map(([h, content]) => (
        <section key={h} id={slugify(h)} className="flex scroll-mt-24 flex-col gap-2">
          <h2 className="text-h3 font-semibold">{h}</h2>
          {typeof content === "string" ? (
            <p className="text-body">{content}</p>
          ) : (
            <div className="flex flex-col gap-3 text-body [&_a]:font-semibold [&_a]:text-primary [&_a]:underline [&_li]:pl-1 [&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-1.5 [&_ul]:pl-5">
              {content}
            </div>
          )}
        </section>
      ))}
      {children}
    </div>
  );
}
