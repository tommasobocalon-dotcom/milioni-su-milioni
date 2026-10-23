import type { Metadata } from "next";
import { Suspense } from "react";
import { parseResultsParams, Results, ResultsSkeleton } from "@/components/site/results";

export const metadata: Metadata = {
  title: "Trova Professionista",
  description: "Geometri, tecnici e artigiani verificati in Veneto, con prezzi indicativi e recensioni verificate.",
};

export default function TrovaProfessionistaPage({ searchParams }: PageProps<"/trova-professionista">) {
  return (
    <Suspense fallback={<ResultsSkeleton />}>
      {searchParams.then((sp) => (
        <Results mode="pro" params={parseResultsParams(sp)} />
      ))}
    </Suspense>
  );
}
