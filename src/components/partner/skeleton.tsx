export function PartnerSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Caricamento">
      <div className="h-11 w-72 animate-pulse rounded bg-muted" />
      <div className="grid gap-4 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
      <div className="h-96 animate-pulse rounded-lg bg-muted" />
    </div>
  );
}
