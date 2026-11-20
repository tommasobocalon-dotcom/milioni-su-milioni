import { ABOUT_PHOTOS, CATEGORY_PHOTOS, HOW_PHOTOS } from "@/lib/data/category-photos";

const ISTAT_CREDIT = {
  title: "Confini delle province del Veneto",
  author: "ISTAT",
  license: "CC BY 3.0",
  licenseUrl: "https://creativecommons.org/licenses/by/3.0/it/",
  page: "https://www.istat.it/it/archivio/210584",
};

/**
 * Crediti di foto e mappa: le licenze CC BY e CC BY-SA di alcune foto e dei confini ISTAT chiedono di citare autore e licenza.
 * Prima stavano nel footer; dal 20/11/2026 (cliente) stanno in fondo alla pagina Termini.
 */
export function MediaCredits() {
  const credits = [
    ...new Map(
      [...Object.values(CATEGORY_PHOTOS), ...Object.values(ABOUT_PHOTOS), ...Object.values(HOW_PHOTOS)].map((p) => [p.credit.page, p.credit]),
    ).values(),
    ISTAT_CREDIT,
  ];
  return (
    <section id="crediti" aria-labelledby="crediti-titolo" className="flex scroll-mt-24 flex-col gap-2">
      <h2 id="crediti-titolo" className="text-h3 font-semibold">
        Crediti di foto e mappe
      </h2>
      <ul className="flex flex-col gap-1.5 text-body-s text-ink-2">
        {credits.map((cr) => (
          <li key={cr.page}>
            <a href={cr.page} className="underline underline-offset-2 hover:text-primary" rel="noopener" target="_blank">
              “{cr.title}”
            </a>
            {cr.author ? ` di ${cr.author}` : ""},{" "}
            <a href={cr.licenseUrl} className="underline underline-offset-2 hover:text-primary" rel="noopener license" target="_blank">
              {cr.license}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
