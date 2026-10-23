import { Geco } from "@/components/site/geco";

export function ComingSoon({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="flex flex-col items-start gap-4 rounded-lg border border-dashed border-line-strong bg-surface p-8 md:flex-row md:items-center">
      <Geco outfit="pensa" size={120} />
      <div className="flex flex-col gap-2">
        <h2 className="text-h3 font-semibold">{title}</h2>
        <p className="text-body-s text-ink-2">Questa sezione arriva nella prossima versione. Conterrà:</p>
        <ul className="list-disc pl-5 text-body-s">
          {items.map((i) => (
            <li key={i}>{i}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
