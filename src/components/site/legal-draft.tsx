import { Geco } from "@/components/site/geco";

export function LegalDraft({ title, sections }: { title: string; sections: [heading: string, text: string][] }) {
  return (
    <div className="container-page flex max-w-3xl flex-col gap-8 py-12">
      <h1 className="font-display text-h1">{title}</h1>
      <p className="flex items-center gap-3 rounded-md bg-ambra-100 p-4 text-body-s">
        <Geco outfit="pensa" size={48} />
        Bozza di lavoro: il testo definitivo va validato con il consulente legale e privacy prima della pubblicazione (PRD §16).
      </p>
      {sections.map(([h, t]) => (
        <section key={h} className="flex flex-col gap-2">
          <h2 className="text-h3 font-semibold">{h}</h2>
          <p className="text-body">{t}</p>
        </section>
      ))}
    </div>
  );
}
