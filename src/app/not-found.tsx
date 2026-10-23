import { Geco } from "@/components/site/geco";
import { SiteFooter } from "@/components/site/footer";
import { SiteHeader } from "@/components/site/header";
import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="contenuto" className="container-page flex flex-1 flex-col items-center justify-center gap-5 py-20 text-center">
        <Geco outfit="errore" size={200} />
        <h1 className="font-display text-h1">Questa pagina non c&apos;è</h1>
        <p className="max-w-md text-body text-ink-2">
          Forse il link è vecchio o il partner non è più attivo. Il geco si è aggrappato al muro, ma qui non trova niente.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <ButtonLink href="/">Torna alla home</ButtonLink>
          <ButtonLink href="/trova-professionista" variant="secondary">
            Cerca un professionista
          </ButtonLink>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
