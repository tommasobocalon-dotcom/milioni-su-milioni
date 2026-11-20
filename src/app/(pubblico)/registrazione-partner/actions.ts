"use server";

import { eq, like } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { auditLogs, categories, municipalities, partnerMembers, partners, serviceAreas, users } from "@/lib/db/schema";
import { slugify } from "@/lib/domain/format";
import { billingContactProblem, freeSlug, isValidVatNumber, normalizeVatNumber } from "@/lib/domain/partner-signup";
import { ipRateLimited } from "@/lib/security/ip-limit";
import { adminBaseUrl } from "@/lib/domain/admin-host";
import { alertTeam } from "@/lib/notify";

export type SignupState = { error?: string; field?: string };

const optional = z.string().trim().max(200);

const SignupSchema = z.object({
  categoryId: z.uuid({ error: "Scegli cosa fa la tua attività" }),
  displayName: z.string().trim().min(2, "Scrivi il nome da mostrare sulla scheda").max(80),
  businessName: z.string().trim().min(2, "Scrivi la ragione sociale").max(160),
  vatNumber: z.string().transform(normalizeVatNumber).refine(isValidVatNumber, "Partita IVA non valida: controlla le 11 cifre"),
  taxCode: z
    .string()
    .trim()
    .toUpperCase()
    .refine((v) => v === "" || /^([A-Z0-9]{16}|\d{11})$/.test(v), "Il codice fiscale ha 16 caratteri (o 11 cifre per le società)"),
  sdiCode: optional,
  pec: optional,
  address: z.string().trim().min(5, "Scrivi l'indirizzo della sede").max(200),
  municipalityId: z.coerce.number().int().positive("Scegli il comune della sede"),
  phone: z
    .string()
    .trim()
    .transform((v) => v.replace(/[\s.-]/g, ""))
    .pipe(z.string().regex(/^\+?\d{6,15}$/, "Scrivi un numero di telefono valido")),
  tagline: z.string().trim().min(3, "Scrivi una frase che presenti la tua attività").max(120),
  terms: z.literal("on", { error: "Serve accettare i termini per i partner" }),
});

const FIELDS = Object.keys(SignupSchema.shape);

/**
 * Registrazione self-service (PRD §6.1). La scheda nasce "in attivazione": resta nascosta finché il
 * primo pagamento non è confermato. Il badge "Verificato" arriva dopo il controllo del team.
 */
export async function registerPartner(_prev: SignupState, formData: FormData): Promise<SignupState> {
  const user = await requireUser("business");
  const [member] = await db.select({ id: partnerMembers.partnerId }).from(partnerMembers).where(eq(partnerMembers.userId, user.id)).limit(1);
  if (member) redirect("/area-partner/abbonamento");

  const parsed = SignupSchema.safeParse(Object.fromEntries(FIELDS.map((k) => [k, formData.get(k) ?? ""])));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { error: issue.message, field: String(issue.path[0]) };
  }
  const d = parsed.data;
  const billing = billingContactProblem({ sdiCode: d.sdiCode, pec: d.pec });
  if (billing) return { error: billing, field: d.sdiCode && d.sdiCode !== "0000000" ? "sdiCode" : "pec" };
  if (await ipRateLimited("partner_signup", 10, 60)) return { error: "Troppe registrazioni da questo dispositivo. Riprova tra un'ora." };

  const [[category], [place], [sameVat]] = await Promise.all([
    db.select({ id: categories.id, type: categories.partnerType }).from(categories).where(eq(categories.id, d.categoryId)),
    db
      .select({ id: municipalities.id, name: municipalities.name, provinceId: municipalities.provinceId, lat: municipalities.lat, lng: municipalities.lng })
      .from(municipalities)
      .where(eq(municipalities.id, d.municipalityId)),
    db.select({ id: partners.id }).from(partners).where(eq(partners.vatNumber, d.vatNumber)).limit(1),
  ]);
  if (!category) return { error: "Scegli cosa fa la tua attività", field: "categoryId" };
  if (!place) return { error: "Scegli il comune della sede", field: "municipalityId" };
  if (sameVat) return { error: "Questa partita IVA ha già una scheda su GecoItalia: scrivi all'assistenza per entrare nell'account", field: "vatNumber" };

  const taken = await db.select({ slug: partners.slug }).from(partners).where(like(partners.slug, `${slugify(d.displayName)}%`));
  const slug = freeSlug(d.displayName, place.name, new Set(taken.map((t) => t.slug)));

  // ponytail: due registrazioni con lo stesso nome nello stesso istante possono scontrarsi sul vincolo
  // unique dello slug (errore generico); il nuovo tentativo dell'utente trova lo slug libero.
  const partnerId = await db.transaction(async (tx) => {
    const [p] = await tx
      .insert(partners)
      .values({
        type: category.type,
        categoryId: category.id,
        businessName: d.businessName,
        displayName: d.displayName,
        slug,
        vatNumber: d.vatNumber,
        taxCode: d.taxCode || null,
        sdiCode: d.sdiCode.toUpperCase() || null,
        pec: d.pec || null,
        address: d.address,
        municipalityId: place.id,
        lat: place.lat,
        lng: place.lng,
        tagline: d.tagline,
        description: "",
        phone: d.phone,
        email: user.email,
      })
      .returning({ id: partners.id });
    await tx.insert(partnerMembers).values({ partnerId: p.id, userId: user.id, role: "owner" });
    await tx.insert(serviceAreas).values({ partnerId: p.id, provinceId: place.provinceId });
    if (user.role === "client") await tx.update(users).set({ role: "partner" }).where(eq(users.id, user.id));
    await tx.insert(auditLogs).values({ actor: user.email, action: "partner.signup", entity: "partner", entityId: p.id, data: { slug } });
    return p.id;
  });
  // La scheda va online solo dopo la verifica del team (listingStatus): chi controlla deve saperlo subito.
  await alertTeam(
    "Nuova azienda da verificare",
    `${d.displayName} (${d.businessName}, P.IVA ${d.vatNumber}) si è iscritta con ${user.email}.\n\n` +
      `La scheda va online solo dopo la verifica di partita IVA e sede: ${adminBaseUrl(process.env.ADMIN_URL, process.env.APP_URL ?? "http://localhost:3000")}/partner/${partnerId}`,
  );
  redirect("/area-partner/abbonamento?benvenuto=1");
}
