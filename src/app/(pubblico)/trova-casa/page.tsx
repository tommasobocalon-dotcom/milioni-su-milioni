import type { Metadata } from "next";
import { Suspense } from "react";
import { parseResultsParams, Results, ResultsSkeleton } from "@/components/site/results";

export const metadata: Metadata = {
  title: "Trova Casa",
  description: "Confronta le agenzie immobiliari della tua zona: specializzazioni e portfolio immobili.",
};

export default function TrovaCasaPage({ searchParams }: PageProps<"/trova-casa">) {
  return (
    <Suspense fallback={<ResultsSkeleton />}>
      {searchParams.then((sp) => (
        <Results mode="agency" params={parseResultsParams(sp)} />
      ))}
    </Suspense>
  );
}
