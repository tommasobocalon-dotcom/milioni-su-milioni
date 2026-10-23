import "server-only";
import { asc } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/lib/db/client";
import { plans } from "@/lib/db/schema";

export async function getPlans() {
  "use cache";
  cacheLife("hours");
  cacheTag("plans");
  return db.select().from(plans).orderBy(asc(plans.monthlyPriceCents));
}
