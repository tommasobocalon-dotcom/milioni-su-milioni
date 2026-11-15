import "server-only";
import { asc } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/lib/db/client";
import { plans } from "@/lib/db/schema";
import { freePlanOpen } from "@/lib/domain/free-plan";
import { launchDate, planPromo } from "@/lib/domain/offers";

export async function getPlans() {
  "use cache";
  cacheLife("hours");
  cacheTag("plans");
  return db.select().from(plans).orderBy(asc(plans.monthlyPriceCents));
}

/** Piani con la promo del momento: quella dell'annuale finisce 6 mesi dopo il lancio, quindi si ricalcola ogni ora. */
export async function getPlansWithPromo() {
  "use cache";
  cacheLife("hours");
  cacheTag("plans");
  const now = new Date();
  const launch = launchDate();
  return (await getPlans()).map((p) => ({
    ...p,
    promo: { monthly: planPromo(p, "monthly", now, launch), yearly: planPromo(p, "yearly", now, launch) },
  }));
}

/** Il piano gratuito di lancio è ancora aperto alle nuove aziende (6 mesi dal lancio): si ricontrolla ogni ora. */
export async function getFreePlanOpen() {
  "use cache";
  cacheLife("hours");
  cacheTag("plans");
  return freePlanOpen(new Date(), launchDate());
}
