"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { areaRequests, auditLogs, boosts, categories, leads, partners, partnerServices, serviceQuestions, services } from "@/lib/db/schema";
import { CategoryInput, QuestionInput, ServiceInput, uniqueQuestionKey, uniqueSlug } from "@/lib/domain/taxonomy";
import type { FormState } from "@/components/ui/message-form";

/**
 * Gestionale → Categorie (PRD §10, "Tassonomia"): categorie, servizi del listino e domande del modulo di richiesta.
 * Gli slug (negli indirizzi, es. /idraulico/padova) e le chiavi delle domande non cambiano dopo la creazione; le
 * richieste già arrivate tengono testo della domanda e risposta, quindi modificare o togliere una domanda non le tocca.
 */

const Id = z.uuid();
const Order = z.string().trim().min(1).pipe(z.coerce.number<string>().int().min(0).max(999)).optional();
const ORDER_ERROR = "L’ordine deve essere un numero intero tra 0 e 999";
const firstError = (e: z.ZodError) => e.issues[0]?.message ?? "Controlla i campi";
const fields = (fd: FormData, names: string[]) => Object.fromEntries(names.map((n) => [n, fd.get(n) ?? undefined]));

/** Le categorie stanno in Home, risultati, pagine per comune e moduli: tutte in cache "catalog". */
function refresh(categoryId?: string) {
  updateTag("catalog");
  revalidatePath("/admin/categorie");
  if (categoryId) revalidatePath(`/admin/categorie/${categoryId}`);
}

async function audit(actor: string, action: string, entityId: string, data: Record<string, unknown>) {
  await db.insert(auditLogs).values({ actor, action, entity: "taxonomy", entityId, data });
}

export async function createCategoryAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = CategoryInput.safeParse(fields(fd, ["name", "pluralName", "partnerType", "icon"]));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const taken = (await db.select({ slug: categories.slug }).from(categories)).map((r) => r.slug);
  const [{ max }] = await db.select({ max: sql<number>`coalesce(max(${categories.sortOrder}), 0)::int` }).from(categories);
  const [row] = await db
    .insert(categories)
    .values({ ...parsed.data, slug: uniqueSlug(parsed.data.name, taken), sortOrder: max + 1 })
    .returning({ id: categories.id, slug: categories.slug });
  await audit(admin.email, "category.create", row.id, { name: parsed.data.name, slug: row.slug });
  refresh();
  redirect(`/admin/categorie/${row.id}`);
}

export async function updateCategoryAction(id: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  if (!Id.safeParse(id).success) return { error: "Categoria non valida" };
  // Il tipo di azienda non cambia: deciderebbe di nuovo indirizzi e modulo delle aziende già iscritte.
  const parsed = CategoryInput.omit({ partnerType: true }).safeParse(fields(fd, ["name", "pluralName", "icon"]));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const order = Order.safeParse(fd.get("sortOrder") ?? undefined);
  if (!order.success) return { error: ORDER_ERROR };
  const done = await db
    .update(categories)
    .set({ ...parsed.data, sortOrder: order.data })
    .where(eq(categories.id, id))
    .returning({ id: categories.id });
  if (!done.length) return { error: "Categoria non trovata" };
  await audit(admin.email, "category.update", id, parsed.data);
  refresh(id);
  return { ok: "Categoria salvata" };
}

export async function deleteCategoryAction(id: string): Promise<FormState> {
  const admin = await requireAdmin();
  if (!Id.safeParse(id).success) return { error: "Categoria non valida" };
  const problem = await db.transaction(async (tx) => {
    const [row] = await tx.select({ name: categories.name }).from(categories).where(eq(categories.id, id)).for("update");
    if (!row) return "Categoria non trovata";
    const [{ n }] = await tx.execute<{ n: number }>(
      sql`select (select count(*) from ${partners} where category_id = ${id})
        + (select count(*) from ${leads} where category_id = ${id})
        + (select count(*) from ${areaRequests} where category_id = ${id})
        + (select count(*) from ${boosts} where category_id = ${id}) as n`,
    );
    if (Number(n) > 0) return "La categoria è usata da aziende, richieste di contatto, richieste di zona o boost. Non si può eliminare.";
    await tx.delete(categories).where(eq(categories.id, id));
    await tx.insert(auditLogs).values({ actor: admin.email, action: "category.delete", entity: "taxonomy", entityId: id, data: { name: row.name } });
    return null;
  });
  if (problem) return { error: problem };
  refresh();
  redirect("/admin/categorie");
}

export async function createServiceAction(categoryId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  if (!Id.safeParse(categoryId).success) return { error: "Categoria non valida" };
  const parsed = ServiceInput.safeParse(fields(fd, ["name", "defaultUnit"]));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const taken = (await db.select({ slug: services.slug }).from(services).where(eq(services.categoryId, categoryId))).map((r) => r.slug);
  const [row] = await db
    .insert(services)
    .values({ categoryId, ...parsed.data, slug: uniqueSlug(parsed.data.name, taken) })
    .returning({ id: services.id });
  await audit(admin.email, "service.create", row.id, { categoryId, ...parsed.data });
  refresh(categoryId);
  return { ok: "Servizio aggiunto" };
}

export async function updateServiceAction(serviceId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  if (!Id.safeParse(serviceId).success) return { error: "Servizio non valido" };
  const parsed = ServiceInput.safeParse(fields(fd, ["name", "defaultUnit"]));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const [row] = await db.update(services).set(parsed.data).where(eq(services.id, serviceId)).returning({ categoryId: services.categoryId });
  if (!row) return { error: "Servizio non trovato" };
  await audit(admin.email, "service.update", serviceId, parsed.data);
  refresh(row.categoryId);
  return { ok: "Servizio salvato" };
}

export async function deleteServiceAction(serviceId: string): Promise<FormState> {
  const admin = await requireAdmin();
  if (!Id.safeParse(serviceId).success) return { error: "Servizio non valido" };
  const result = await db.transaction(async (tx) => {
    const [row] = await tx.select({ categoryId: services.categoryId, name: services.name }).from(services).where(eq(services.id, serviceId)).for("update");
    if (!row) return { error: "Servizio non trovato" };
    const [{ n }] = await tx.execute<{ n: number }>(
      sql`select (select count(*) from ${partnerServices} where service_id = ${serviceId}) + (select count(*) from ${leads} where service_id = ${serviceId}) as n`,
    );
    if (Number(n) > 0) return { error: "È nel listino di qualche azienda o in qualche richiesta: non si può eliminare" };
    await tx.delete(services).where(eq(services.id, serviceId));
    await tx.insert(auditLogs).values({ actor: admin.email, action: "service.delete", entity: "taxonomy", entityId: serviceId, data: { name: row.name } });
    return { categoryId: row.categoryId };
  });
  if ("error" in result) return { error: result.error };
  refresh(result.categoryId);
  return { ok: "Servizio eliminato" };
}

/** Domanda per tutta la categoria (null) o per un servizio suo; undefined = servizio non valido. */
async function serviceOf(categoryId: string, raw: FormDataEntryValue | null): Promise<string | null | undefined> {
  if (!raw) return null;
  const id = Id.safeParse(raw);
  if (!id.success) return undefined;
  const [row] = await db.select({ id: services.id }).from(services).where(and(eq(services.id, id.data), eq(services.categoryId, categoryId)));
  return row ? row.id : undefined;
}

const QUESTION_FIELDS = ["label", "help", "type", "required", "options"];

export async function createQuestionAction(categoryId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  if (!Id.safeParse(categoryId).success) return { error: "Categoria non valida" };
  const parsed = QuestionInput.safeParse(fields(fd, QUESTION_FIELDS));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const serviceId = await serviceOf(categoryId, fd.get("serviceId"));
  if (serviceId === undefined) return { error: "Servizio non valido" };
  const existing = await db.select({ key: serviceQuestions.key, order: serviceQuestions.sortOrder }).from(serviceQuestions).where(eq(serviceQuestions.categoryId, categoryId));
  const [row] = await db
    .insert(serviceQuestions)
    .values({
      categoryId,
      serviceId,
      ...parsed.data,
      key: uniqueQuestionKey(parsed.data.label, existing.map((q) => q.key)),
      sortOrder: Math.max(0, ...existing.map((q) => q.order)) + 1,
    })
    .returning({ id: serviceQuestions.id });
  await audit(admin.email, "question.create", row.id, { categoryId, label: parsed.data.label });
  refresh(categoryId);
  return { ok: "Domanda aggiunta" };
}

export async function updateQuestionAction(questionId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  if (!Id.safeParse(questionId).success) return { error: "Domanda non valida" };
  const parsed = QuestionInput.safeParse(fields(fd, QUESTION_FIELDS));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const order = Order.safeParse(fd.get("sortOrder") ?? undefined);
  if (!order.success) return { error: ORDER_ERROR };
  const [current] = await db.select({ categoryId: serviceQuestions.categoryId }).from(serviceQuestions).where(eq(serviceQuestions.id, questionId));
  if (!current) return { error: "Domanda non trovata" };
  const serviceId = await serviceOf(current.categoryId, fd.get("serviceId"));
  if (serviceId === undefined) return { error: "Servizio non valido" };
  await db
    .update(serviceQuestions)
    .set({ ...parsed.data, serviceId, sortOrder: order.data })
    .where(eq(serviceQuestions.id, questionId));
  await audit(admin.email, "question.update", questionId, { label: parsed.data.label });
  refresh(current.categoryId);
  return { ok: "Domanda salvata" };
}

export async function deleteQuestionAction(questionId: string): Promise<FormState> {
  const admin = await requireAdmin();
  if (!Id.safeParse(questionId).success) return { error: "Domanda non valida" };
  const [row] = await db
    .delete(serviceQuestions)
    .where(eq(serviceQuestions.id, questionId))
    .returning({ categoryId: serviceQuestions.categoryId, label: serviceQuestions.label });
  if (!row) return { error: "Domanda non trovata" };
  await audit(admin.email, "question.delete", questionId, { label: row.label });
  refresh(row.categoryId);
  return { ok: "Domanda eliminata" };
}
