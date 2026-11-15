"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { issueOtp, OtpRateLimitError, verifyOtp } from "@/lib/auth/otp-service";
import { ipRateLimited } from "@/lib/security/ip-limit";
import { TURNSTILE_ERROR, turnstileOk } from "@/lib/security/turnstile";
import { findPlace } from "@/lib/data/catalog";
import { getRequestContext } from "@/lib/data/partners";
import { db } from "@/lib/db/client";
import { leads, partners } from "@/lib/db/schema";
import { maskEmail, normalizeEmail, normalizeItalianPhone } from "@/lib/domain/otp";
import { confirmLead, createPendingLead } from "@/lib/leads/service";
import { AGENCY_REQUEST_TYPES, CALLBACK_SLOTS, OTHER_REQUEST, TIMINGS } from "@/lib/leads/options";
import { DeliveryError, sendEmail, showDevCodes } from "@/lib/notify";

const RequestSchema = z.object({
  partnerSlug: z.string().min(1).max(120),
  requestType: z.string().trim().min(1).max(120),
  serviceId: z.uuid().nullable(),
  answers: z.record(z.string(), z.string().trim().max(200)),
  description: z.string().trim().max(2000),
  municipality: z.string().trim().min(2).max(80),
  timing: z.enum(TIMINGS),
  callbackSlot: z.enum(CALLBACK_SLOTS),
  name: z.string().trim().min(2, "Scrivi nome e cognome").max(80),
  email: z.email("Controlla l'indirizzo email").max(160),
  phone: z.string().trim().min(6).max(25),
  privacy: z.literal(true, { error: "Serve il consenso per inviare la richiesta" }),
  marketing: z.boolean(),
  /** Campo esca per i bot: deve restare vuoto. */
  website: z.string().max(0).optional(),
  /** Token di Cloudflare Turnstile (assente se il controllo è spento). */
  turnstileToken: z.string().max(4096).optional(),
});

export type LeadRequestInput = z.input<typeof RequestSchema>;

export type SubmitResult =
  | { ok: true; leadId: string; maskedEmail: string; devCode?: string }
  | { ok: false; error: string; field?: string };

export async function submitLeadRequest(input: LeadRequestInput): Promise<SubmitResult> {
  const parsed = RequestSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: issue.message, field: String(issue.path[0] ?? "") };
  }
  const data = parsed.data;

  if (await ipRateLimited("lead", 30, 15)) return { ok: false, error: "Troppe richieste da questo dispositivo. Riprova tra qualche minuto." };
  if (!(await turnstileOk(data.turnstileToken))) return { ok: false, error: TURNSTILE_ERROR };

  const ctx = await getRequestContext(data.partnerSlug);
  if (!ctx) return { ok: false, error: "Partner non trovato" };

  const phone = normalizeItalianPhone(data.phone);
  if (!phone) return { ok: false, error: "Scrivi un numero di telefono italiano valido", field: "phone" };
  const place = await findPlace(data.municipality);
  if (!place) return { ok: false, error: "Scegli un comune del Veneto dall'elenco", field: "municipality" };

  // Tipo di richiesta e servizio devono essere tra quelli offerti.
  const isAgency = ctx.partner.type === "agency";
  const service = data.serviceId ? ctx.services.find((s) => s.id === data.serviceId) ?? null : null;
  if (data.serviceId && !service) return { ok: false, error: "Servizio non valido" };
  const validTypes = isAgency ? [...AGENCY_REQUEST_TYPES] : [...ctx.services.map((s) => s.name), OTHER_REQUEST];
  if (!validTypes.includes(data.requestType)) return { ok: false, error: "Tipo di richiesta non valido", field: "requestType" };

  // Solo le domande previste, con i valori ammessi.
  const answers = [];
  for (const q of ctx.questions) {
    const value = data.answers[q.key]?.trim() ?? "";
    if (!value) {
      if (q.required) return { ok: false, error: `Rispondi a: ${q.label}`, field: q.key };
      continue;
    }
    if (q.type === "select" && !q.options?.some((o) => o.value === value)) return { ok: false, error: `Valore non valido per: ${q.label}` };
    if (q.type === "number" && !/^\d{1,6}$/.test(value)) return { ok: false, error: `Scrivi un numero per: ${q.label}`, field: q.key };
    answers.push({ key: q.key, label: q.label, value });
  }

  const email = normalizeEmail(data.email);
  const leadId = await createPendingLead({
    partnerId: ctx.partner.id,
    categoryId: ctx.partner.categoryId,
    serviceId: service?.id ?? null,
    municipalityId: place.id,
    requestType: data.requestType,
    answers,
    description: data.description || null,
    timing: data.timing,
    callbackSlot: data.callbackSlot,
    clientName: data.name,
    clientEmail: email,
    clientPhone: phone,
    privacyConsent: true,
    marketingConsent: data.marketing,
  });

  try {
    const { code } = await issueOtp({ purpose: "lead", channel: "email", target: email, leadId });
    await sendCode(email, ctx.partner.displayName, code);
    return { ok: true, leadId, maskedEmail: maskEmail(email), devCode: showDevCodes() ? code : undefined };
  } catch (e) {
    if (e instanceof OtpRateLimitError) return { ok: false, error: e.message };
    if (e instanceof DeliveryError) return codeFailed(e);
    throw e;
  }
}

/** Il codice di verifica della richiesta arriva per email (dal 14/11/2026 niente più SMS). */
function sendCode(email: string, partnerName: string, code: string) {
  return sendEmail(
    email,
    `Il tuo codice per la richiesta a ${partnerName}`,
    `Il tuo codice per confermare la richiesta a ${partnerName} è ${code}. Scade tra 10 minuti.`,
  );
}

const CODE_FAILED = "Non riusciamo a inviare l'email con il codice in questo momento. Riprova tra qualche minuto.";

function codeFailed(e: DeliveryError): { ok: false; error: string } {
  console.error("[codice]", e.message);
  return { ok: false, error: CODE_FAILED };
}

/** Le email dopo la conferma sono avvisi: se non partono la richiesta resta valida, si registra solo l'errore. */
async function bestEffort(what: string, send: Promise<void>) {
  try {
    await send;
  } catch (e) {
    console.error(`[email] ${what} non inviata:`, e instanceof Error ? e.message : e);
  }
}

async function pendingLead(leadId: string) {
  if (!z.uuid().safeParse(leadId).success) return null;
  const [lead] = await db
    .select({ id: leads.id, email: leads.clientEmail, verifiedAt: leads.verifiedAt, partnerName: partners.displayName })
    .from(leads)
    .innerJoin(partners, eq(partners.id, leads.partnerId))
    .where(eq(leads.id, leadId));
  return lead ?? null;
}

export type VerifyResult = { ok: true; leadId: string } | { ok: false; error: string };

export async function verifyLeadRequest(leadId: string, code: string): Promise<VerifyResult> {
  const lead = await pendingLead(leadId);
  if (!lead) return { ok: false, error: "Richiesta non trovata" };
  if (!lead.verifiedAt) {
    if (!/^\d{6}$/.test(code.trim())) return { ok: false, error: "Il codice è di 6 cifre" };
    const check = await verifyOtp({ purpose: "lead", target: lead.email, code, leadId });
    if (check === "wrong") return { ok: false, error: "Codice non corretto. Controlla l'email e riprova." };
    if (check === "expired") return { ok: false, error: "Il codice è scaduto: chiedine uno nuovo." };
    if (check === "locked") return { ok: false, error: "Troppi tentativi: chiedi un nuovo codice." };

    const { outcome, partnerId } = await confirmLead(lead.id);
    if (outcome === "delivered") {
      await bestEffort("avviso al partner", notifyPartner(partnerId, lead.id));
      await bestEffort(
        "conferma al cliente",
        sendEmail(
          lead.email,
          `Richiesta inviata a ${lead.partnerName}`,
          `Abbiamo inviato la tua richiesta a ${lead.partnerName}, che ti ricontatterà nella fascia oraria che hai indicato. Tra qualche giorno ti chiederemo com'è andata.`,
        ),
      );
    }
  }
  return { ok: true, leadId: lead.id };
}

export async function resendLeadCode(leadId: string): Promise<{ ok: boolean; error?: string; devCode?: string }> {
  const lead = await pendingLead(leadId);
  if (!lead || lead.verifiedAt) return { ok: false, error: "Richiesta già confermata o non trovata" };
  try {
    const { code } = await issueOtp({ purpose: "lead", channel: "email", target: lead.email, leadId });
    await sendCode(lead.email, lead.partnerName, code);
    return { ok: true, devCode: showDevCodes() ? code : undefined };
  } catch (e) {
    if (e instanceof OtpRateLimitError) return { ok: false, error: e.message };
    if (e instanceof DeliveryError) return codeFailed(e);
    throw e;
  }
}

async function notifyPartner(partnerId: string, leadId: string) {
  const [p] = await db.select({ email: partners.email, name: partners.displayName }).from(partners).where(eq(partners.id, partnerId));
  if (!p?.email) return;
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const [lead] = await db.select({ charge: leads.charge }).from(leads).where(eq(leads.id, leadId));
  if (lead?.charge === "locked") {
    // Piano gratuito oltre le 3 richieste del mese: si dice che c'è, senza dati del cliente.
    await sendEmail(
      p.email,
      "Nuova richiesta di contatto: scegli un piano per vederla",
      `Ciao ${p.name}, hai una nuova richiesta, ma questo mese hai già ricevuto le 3 gratuite. Scegli un piano per vedere i contatti del cliente: ${appUrl}/area-partner/abbonamento`,
    );
    return;
  }
  await sendEmail(p.email, "Nuova richiesta di contatto verificata", `Ciao ${p.name}, hai una nuova richiesta: ${appUrl}/area-partner/lead/${leadId}`);
}
