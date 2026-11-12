import Image from "next/image";

/**
 * Foto di un progetto nel suo riquadro 4:3: una sola foto ferma, più foto in una fila che si scorre di lato
 * (scroll-snap, niente JavaScript; con la tastiera si scorre con le frecce dopo il Tab).
 */
export function ProjectPhotos({ photos, title, sizes }: { photos: string[]; title: string; sizes: string }) {
  if (photos.length === 1) return <Image src={photos[0]} alt={title} fill sizes={sizes} className="object-cover" />;
  return (
    <>
      <div
        role="region"
        tabIndex={0}
        aria-label={`${title}: ${photos.length} foto, scorri di lato`}
        className="absolute inset-0 flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        {photos.map((src, i) => (
          <div key={src} className="relative h-full w-full shrink-0 snap-start">
            <Image src={src} alt={`${title}, foto ${i + 1} di ${photos.length}`} fill sizes={sizes} className="object-cover" />
          </div>
        ))}
      </div>
      <span className="pointer-events-none absolute right-2 bottom-2 rounded-full bg-ink/75 px-2 py-0.5 text-caption font-semibold text-on-brand">
        {photos.length} foto
      </span>
    </>
  );
}
