import { ButtonLink } from "@/components/ui/button";

/**
 * "Pagina non trovata" delle pagine pubbliche (azienda, lavoro o categoria × comune che non esistono).
 * Senza header e footer: li mette già il layout delle pagine pubbliche. Con quello della radice comparivano doppi,
 * perché notFound() arriva dentro un <Suspense> quando intestazione e piè di pagina sono già partiti.
 */
export default function PublicNotFound() {
  return (
    <div className="container-page flex flex-col items-center justify-center gap-5 py-20 text-center">
      <h1 className="font-display text-h1">Questa pagina non c&apos;è</h1>
      <p className="max-w-md text-body text-ink-2">Forse il link è vecchio o l&apos;azienda non è più attiva.</p>
      <div className="flex flex-wrap justify-center gap-3">
        <ButtonLink href="/">Torna alla home</ButtonLink>
        <ButtonLink href="/trova-professionista" variant="secondary">
          Cerca un professionista
        </ButtonLink>
      </div>
    </div>
  );
}
