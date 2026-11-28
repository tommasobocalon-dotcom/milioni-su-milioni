import "server-only";
import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { areaRequests, boosts, categories, leads, partners, partnerServices, serviceQuestions, services } from "@/lib/db/schema";

/**
 * Categorie, servizi e domande del modulo di richiesta per il gestionale → Categorie (PRD §10, "Tassonomia").
 * I conteggi dicono cosa li usa: una categoria o un servizio si elimina solo se nessuno li usa.
 */

const count = (query: ReturnType<typeof sql>) => sql<number>`(${query})::int`;

export async function listCategoriesAdmin() {
  return db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      icon: categories.icon,
      partnerType: categories.partnerType,
      services: count(sql`select count(*) from ${services} s where s.category_id = "categories"."id"`),
      questions: count(sql`select count(*) from ${serviceQuestions} q where q.category_id = "categories"."id"`),
      partners: count(sql`select count(*) from ${partners} p where p.category_id = "categories"."id"`),
      online: count(sql`select count(*) from ${partners} p where p.category_id = "categories"."id" and p.account_status = 'active'`),
    })
    .from(categories)
    .orderBy(asc(categories.sortOrder), asc(categories.name));
}

export async function getCategoryAdmin(id: string) {
  const [category] = await db
    .select({
      id: categories.id,
      name: categories.name,
      pluralName: categories.pluralName,
      slug: categories.slug,
      icon: categories.icon,
      partnerType: categories.partnerType,
      sortOrder: categories.sortOrder,
      partners: count(sql`select count(*) from ${partners} p where p.category_id = "categories"."id"`),
      leads: count(sql`select count(*) from ${leads} l where l.category_id = "categories"."id"`),
      areaRequests: count(sql`select count(*) from ${areaRequests} ar where ar.category_id = "categories"."id"`),
      boosts: count(sql`select count(*) from ${boosts} b where b.category_id = "categories"."id"`),
    })
    .from(categories)
    .where(eq(categories.id, id));
  if (!category) return null;
  const [serviceRows, questionRows] = await Promise.all([
    db
      .select({
        id: services.id,
        name: services.name,
        defaultUnit: services.defaultUnit,
        priceLists: count(sql`select count(*) from ${partnerServices} ps where ps.service_id = "services"."id"`),
        leads: count(sql`select count(*) from ${leads} l where l.service_id = "services"."id"`),
      })
      .from(services)
      .where(eq(services.categoryId, id))
      .orderBy(asc(services.name)),
    db
      .select({
        id: serviceQuestions.id,
        serviceId: serviceQuestions.serviceId,
        label: serviceQuestions.label,
        help: serviceQuestions.help,
        type: serviceQuestions.type,
        options: serviceQuestions.options,
        required: serviceQuestions.required,
        sortOrder: serviceQuestions.sortOrder,
      })
      .from(serviceQuestions)
      .where(eq(serviceQuestions.categoryId, id))
      .orderBy(asc(serviceQuestions.sortOrder), asc(serviceQuestions.label)),
  ]);
  return { ...category, services: serviceRows, questions: questionRows };
}

export type CategoryAdmin = NonNullable<Awaited<ReturnType<typeof getCategoryAdmin>>>;
