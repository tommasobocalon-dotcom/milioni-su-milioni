import { createHash } from "node:crypto";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as s from "../src/lib/db/schema";
import { slugify } from "../src/lib/domain/format";
import { DEMO_ACCOUNT } from "../src/lib/auth/demo";
import { hashPassword } from "../src/lib/domain/password";
import { tokenExpiryFrom } from "../src/lib/domain/tokens";
import {
  CATEGORIES,
  MUNICIPALITIES,
  PARTNER_REPLIES,
  PARTNERS,
  PLANS,
  PROVINCES,
  QUESTIONS,
  REGIONS,
  REVIEW_AUTHORS,
  REVIEW_TEXTS,
  ROSSI_LEADS,
} from "./seed-data";

type Db = PostgresJsDatabase<typeof s>;

/**
 * UUID stabile ricavato da una chiave: lo stesso dato di esempio ha lo stesso id a ogni reset,
 * così la cache del server di sviluppo resta coerente col database.
 */
function sid(key: string): string {
  const h = createHash("sha256").update(`geco-seed:${key}`).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-${((parseInt(h[16], 16) & 0x3) | 0x8).toString(16)}${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

const HOUR = 3600_000;
const DAY = 24 * HOUR;

/** Generatore pseudo-casuale deterministico: lo stesso seed produce sempre gli stessi dati. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Voti interi la cui media si avvicina a `average`. */
function ratingsFor(average: number, count: number, rand: () => number): number[] {
  let fives = Math.round(count * Math.max(0, average - 4));
  const rest = count - fives;
  const threes = Math.floor(rest * 0.12);
  const ones = rest > 20 ? 1 : 0;
  let fours = rest - threes - ones;
  const shift = Math.min(fours, threes + 3 * ones);
  fours -= shift;
  fives += shift;
  const out = [...Array(fives).fill(5), ...Array(fours).fill(4), ...Array(threes).fill(3), ...Array(ones).fill(1)];
  return out.sort(() => rand() - 0.5);
}

const clamp = (v: number) => Math.max(1, Math.min(5, v));

async function insertChunks<T extends Record<string, unknown>>(db: Db, table: Parameters<Db["insert"]>[0], rows: T[], size = 200) {
  for (let i = 0; i < rows.length; i += size) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await db.insert(table).values(rows.slice(i, i + size) as any);
  }
}

export async function seed(db: Db) {
  const now = new Date();
  const rand = rng(20261023);

  await db.insert(s.regions).values(REGIONS);
  await db.insert(s.provinces).values(PROVINCES.map((p) => ({ ...p, regionId: 5 })));
  await db.insert(s.municipalities).values(MUNICIPALITIES.map((m) => ({ ...m, slug: slugify(m.name) })));
  const muni = new Map(MUNICIPALITIES.map((m) => [m.id, m]));
  const provinceByCode = new Map(PROVINCES.map((p) => [p.code, p]));

  // Tassonomia
  const categoryIds = new Map<string, string>();
  const serviceIds = new Map<string, string>(); // "categoria/servizio" → id
  for (const [i, c] of CATEGORIES.entries()) {
    const [cat] = await db
      .insert(s.categories)
      .values({ id: sid(`category:${c.slug}`), partnerType: c.partnerType, name: c.name, pluralName: c.pluralName, slug: c.slug, icon: c.icon, sortOrder: i })
      .returning({ id: s.categories.id });
    categoryIds.set(c.slug, cat.id);
    const svcs = await db
      .insert(s.services)
      .values(c.services.map(([slug, name, unit]) => ({ id: sid(`service:${c.slug}/${slug}`), categoryId: cat.id, slug, name, defaultUnit: unit })))
      .returning({ id: s.services.id, slug: s.services.slug });
    for (const sv of svcs) serviceIds.set(`${c.slug}/${sv.slug}`, sv.id);

    const qs = c.partnerType === "agency" ? QUESTIONS[c.slug] : [...QUESTIONS.common, ...(QUESTIONS[c.slug] ?? [])];
    if (qs?.length) {
      await db.insert(s.serviceQuestions).values(
        qs.map((q, order) => ({
          categoryId: cat.id,
          key: q.key,
          label: q.label,
          help: q.help ?? null,
          type: q.type,
          options: q.options?.map((o) => ({ value: o, label: o })) ?? null,
          required: q.required ?? false,
          sortOrder: order,
        })),
      );
    }
  }

  const plans = await db
    .insert(s.plans)
    .values(PLANS.map((p) => ({ ...p, id: sid(`plan:${p.code}`) })))
    .returning({ id: s.plans.id, code: s.plans.code });
  const planId = new Map(plans.map((p) => [p.code, p.id]));

  // Partner
  const partnerIds = new Map<string, string>();
  for (const p of PARTNERS) {
    const m = muni.get(p.municipality)!;
    const cat = CATEGORIES.find((c) => c.slug === p.category)!;
    const [row] = await db
      .insert(s.partners)
      .values({
        id: sid(`partner:${p.slug}`),
        type: cat.partnerType,
        categoryId: categoryIds.get(p.category)!,
        businessName: p.businessName,
        displayName: p.displayName,
        slug: p.slug,
        vatNumber: String(Math.floor(rand() * 9e10) + 1e10).padStart(11, "0"),
        sdiCode: "M5UXCR1",
        address: "Indirizzo di esempio",
        municipalityId: p.municipality,
        lat: m.lat + (rand() - 0.5) * 0.02,
        lng: m.lng + (rand() - 0.5) * 0.02,
        tagline: p.tagline,
        description: p.description,
        specialties: p.specialties,
        foundedYear: p.foundedYear,
        phone: "049 000 0000",
        email: `info@${p.slug.replace(/-/g, "")}.example`,
        hideDirectContacts: true,
        openingHours: p.hours ?? [],
        responseMinutes: p.responseMinutes,
        verificationStatus: "verified",
        accountStatus: "active",
        completeness: 70 + Math.floor(rand() * 26),
      })
      .returning({ id: s.partners.id });
    partnerIds.set(p.slug, row.id);

    await db.insert(s.partnerServices).values(
      p.prices.map(([svc, from, to, notes], order) => ({
        partnerId: row.id,
        serviceId: serviceIds.get(`${p.category}/${svc}`)!,
        priceFrom: from,
        priceTo: to,
        unit: cat.services.find(([slug]) => slug === svc)![2],
        notes: notes ?? null,
        sortOrder: order,
      })),
    );

    const areas = [
      ...(p.areas.provinces ?? []).map((code) => ({ partnerId: row.id, provinceId: provinceByCode.get(code)!.id })),
      ...(p.areas.municipalities ?? []).map((id) => ({ partnerId: row.id, municipalityId: id })),
    ];
    await db.insert(s.serviceAreas).values(areas);

    if (p.portfolio.length) {
      await db.insert(s.portfolioItems).values(
        p.portfolio.map((item, order) => ({
          partnerId: row.id,
          kind: cat.partnerType === "agency" ? ("property" as const) : ("work" as const),
          title: item.title,
          municipalityId: item.municipality ?? p.municipality,
          contract: item.contract ?? null,
          priceCents: item.priceCents ?? null,
          sqm: item.sqm ?? null,
          rooms: item.rooms ?? null,
          status: item.contract ? ("available" as const) : null,
          hasBeforeAfter: item.beforeAfter ?? false,
          sortOrder: order,
        })),
      );
    }

    // Recensioni verificate (dati di esempio)
    const texts = REVIEW_TEXTS[cat.partnerType === "agency" ? "agency" : cat.partnerType] ?? REVIEW_TEXTS.artisan;
    const ratings = ratingsFor(p.rating[0], p.rating[1], rand);
    await insertChunks(
      db,
      s.reviews,
      ratings.map((r, i) => {
        const jitter = () => clamp(r + (rand() < 0.25 ? -1 : 0) + (rand() < 0.1 ? 1 : 0));
        return {
          partnerId: row.id,
          authorName: REVIEW_AUTHORS[Math.floor(rand() * REVIEW_AUTHORS.length)],
          rating: r,
          quality: jitter(),
          punctuality: jitter(),
          value: jitter(),
          communication: jitter(),
          text: texts[i % texts.length],
          partnerReply: rand() < 0.35 ? PARTNER_REPLIES[i % PARTNER_REPLIES.length] : null,
          createdAt: new Date(now.getTime() - (i * 5 + Math.floor(rand() * 4)) * DAY),
        };
      }),
    );

    // Abbonamento attivo
    const periodStart = new Date(now.getTime() - (10 + Math.floor(rand() * 15)) * DAY);
    const plan = PLANS.find((pl) => pl.code === p.plan)!;
    await db.insert(s.subscriptions).values({
      partnerId: row.id,
      planId: planId.get(p.plan)!,
      period: rand() < 0.6 ? "yearly" : "monthly",
      status: "active",
      currentPeriodStart: periodStart,
      currentPeriodEnd: new Date(periodStart.getTime() + 30 * DAY),
      leadsUsed: p.slug === "rossi-impianti" ? 18 : Math.floor(rand() * plan.leadsIncluded * 0.8),
      autoUseTokens: false,
    });

    // Token: un pacchetto acquistato e, dove previsto, i token omaggio del rinnovo
    const purchaseAt = new Date(now.getTime() - 52 * DAY);
    await db.insert(s.tokenLedger).values({
      partnerId: row.id,
      kind: "purchase",
      amount: p.slug === "rossi-impianti" ? 120 : 50 + Math.floor(rand() * 4) * 25,
      expiresAt: tokenExpiryFrom(purchaseAt),
      reference: "Pacchetto token (esempio)",
      createdAt: purchaseAt,
    });
    if (plan.renewalTokens > 0) {
      await db.insert(s.tokenLedger).values({
        partnerId: row.id,
        kind: "credit",
        amount: plan.renewalTokens,
        expiresAt: tokenExpiryFrom(periodStart),
        reference: `Token omaggio rinnovo piano ${plan.name}`,
        createdAt: periodStart,
      });
    }

    if (p.boosted) {
      const province = PROVINCES.find((pr) => pr.id === m.provinceId)!;
      await db.insert(s.boosts).values({
        partnerId: row.id,
        categoryId: categoryIds.get(p.category)!,
        provinceId: province.id,
        startsAt: new Date(now.getTime() - 2 * DAY),
        endsAt: new Date(now.getTime() + 5 * DAY),
        tokensSpent: 60,
      });
    }
  }

  // Utente partner per la demo dell'Area Partner
  const [mario] = await db
    .insert(s.users)
    .values({ id: sid("user:mario@rossiimpianti.it"), email: "mario@rossiimpianti.it", name: "Mario Rossi", phone: "+393475550192", role: "partner", passwordHash: await hashPassword(DEMO_ACCOUNT.password) })
    .returning({ id: s.users.id });
  const rossiId = partnerIds.get("rossi-impianti")!;
  await db.insert(s.partnerMembers).values({ partnerId: rossiId, userId: mario.id, role: "owner" });

  // Lead di esempio per Rossi Impianti
  const idraulico = CATEGORIES.find((c) => c.slug === "idraulico")!;
  for (const l of ROSSI_LEADS) {
    const createdAt = new Date(now.getTime() - l.hoursAgo * HOUR);
    const serviceName = idraulico.services.find(([slug]) => slug === l.service)![1];
    const [lead] = await db
      .insert(s.leads)
      .values({
        partnerId: rossiId,
        categoryId: categoryIds.get("idraulico")!,
        serviceId: serviceIds.get(`idraulico/${l.service}`)!,
        municipalityId: l.municipality,
        requestType: serviceName,
        answers: l.answers.map(([label, value]) => ({ key: slugify(label), label, value })),
        description: l.description ?? l.summary,
        timing: l.timing,
        callbackSlot: l.slot,
        clientName: l.name,
        clientEmail: l.email,
        clientPhone: l.phone,
        privacyConsent: true,
        marketingConsent: false,
        status: l.status,
        charge: "quota",
        verifiedAt: createdAt,
        deliveredAt: createdAt,
        createdAt,
      })
      .returning({ id: s.leads.id });
    await db.insert(s.leadEvents).values([
      { leadId: lead.id, type: "verified", message: "Richiesta inviata e verificata con codice SMS", actor: "Cliente", createdAt },
      { leadId: lead.id, type: "delivered", message: "Notifica inviata via email e in Area Partner", actor: "Sistema", createdAt },
    ]);
  }

  // Un lead oltre quota con i contatti nascosti, da sbloccare con i token
  const lockedAt = new Date(now.getTime() - 7 * HOUR);
  const [locked] = await db
    .insert(s.leads)
    .values({
      partnerId: rossiId,
      categoryId: categoryIds.get("idraulico")!,
      serviceId: serviceIds.get("idraulico/bagno")!,
      municipalityId: 28060,
      requestType: "Rifacimento bagno completo",
      answers: [
        { key: "immobile", label: "Tipo di immobile", value: "Appartamento" },
        { key: "mq", label: "Metri quadri interessati", value: "7" },
      ],
      description: "Vorrei rifare il bagno e spostare l'attacco della lavatrice.",
      timing: "Entro 3 mesi",
      callbackSlot: "18:00 – 20:00",
      clientName: "Chiara M.",
      clientEmail: "chiara.m@example.com",
      clientPhone: "+393405556677",
      privacyConsent: true,
      status: "new",
      charge: "locked",
      unlockExpiresAt: new Date(lockedAt.getTime() + 48 * HOUR),
      verifiedAt: lockedAt,
      deliveredAt: lockedAt,
      createdAt: lockedAt,
    })
    .returning({ id: s.leads.id });
  await db.insert(s.leadEvents).values({
    leadId: locked.id,
    type: "locked",
    message: "Lead oltre la quota del piano: contatti nascosti per 48 ore, sbloccabili con i token",
    actor: "Sistema",
    createdAt: lockedAt,
  });

  // Statistiche di esempio per Rossi Impianti: 90 giorni di comparse, visite e clic, con un boost passato
  // (40–33 giorni fa) oltre a quello in corso, così il grafico mostra il salto nei giorni promossi.
  const pastBoostStart = new Date(now.getTime() - 40 * DAY);
  await db.insert(s.boosts).values({
    partnerId: rossiId,
    categoryId: categoryIds.get("idraulico")!,
    provinceId: PROVINCES.find((pr) => pr.slug === "padova")?.id ?? PROVINCES[0].id,
    startsAt: pastBoostStart,
    endsAt: new Date(pastBoostStart.getTime() + 7 * DAY),
    tokensSpent: 60,
  });
  const events: { partnerId: string; type: "impression" | "view" | "contact_click"; createdAt: Date }[] = [];
  for (let d = 89; d >= 0; d--) {
    const boosted = (d <= 40 && d > 33) || d <= 2;
    const weekend = [0, 6].includes(new Date(now.getTime() - d * DAY).getDay());
    const impressions = Math.round((22 + rand() * 14) * (boosted ? 2.4 : 1) * (weekend ? 0.6 : 1));
    for (let i = 0; i < impressions; i++) {
      const createdAt = new Date(now.getTime() - d * DAY - Math.floor(rand() * 12 * HOUR));
      events.push({ partnerId: rossiId, type: "impression", createdAt });
      if (rand() < 0.16) {
        events.push({ partnerId: rossiId, type: "view", createdAt: new Date(createdAt.getTime() + 60_000) });
        if (rand() < 0.28) events.push({ partnerId: rossiId, type: "contact_click", createdAt: new Date(createdAt.getTime() + 120_000) });
      }
    }
  }
  await insertChunks(db, s.profileEvents, events, 500);
}
