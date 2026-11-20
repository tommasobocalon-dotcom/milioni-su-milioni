import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

// ---------------------------------------------------------------------------
// Utenti, sessioni, codici di verifica
// ---------------------------------------------------------------------------

export const userRole = pgEnum("user_role", ["client", "partner", "sales", "admin"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  name: text("name").notNull(),
  /** Foto profilo della persona (es. titolare dell'azienda). */
  avatarUrl: text("avatar_url"),
  /** Hash scrypt (src/lib/domain/password.ts). Null per chi entra solo con Google o Apple. */
  passwordHash: text("password_hash"),
  /** Email confermata con il link (o da Google/Apple). Null finché non è confermata. */
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  role: userRole("role").notNull().default("client"),
  createdAt: createdAt(),
});

export const authTokenPurpose = pgEnum("auth_token_purpose", ["password_reset", "email_verify"]);

/** Link monouso inviati per email (recupero password, conferma email). Si salva solo l'hash del token. */
export const authTokens = pgTable(
  "auth_tokens",
  {
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    purpose: authTokenPurpose("purpose").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("auth_tokens_user_idx").on(t.userId, t.purpose)],
);

export const oauthProvider = pgEnum("oauth_provider", ["google", "apple"]);

/** Account Google / Apple collegati: l'utente si riconosce dall'id del provider, non dall'email. */
export const oauthAccounts = pgTable(
  "oauth_accounts",
  {
    provider: oauthProvider("provider").notNull(),
    providerUserId: text("provider_user_id").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerUserId] }), index("oauth_accounts_user_idx").on(t.userId)],
);

/** Sessioni lato server: nel cookie c'è il token, qui solo il suo hash SHA-256. */
export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const otpPurpose = pgEnum("otp_purpose", ["login", "lead"]);
export const otpChannel = pgEnum("otp_channel", ["email", "sms"]);

export const otpCodes = pgTable(
  "otp_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    purpose: otpPurpose("purpose").notNull(),
    channel: otpChannel("channel").notNull(),
    /** Email o telefono normalizzato a cui è stato inviato il codice. */
    target: text("target").notNull(),
    codeHash: text("code_hash").notNull(),
    attempts: smallint("attempts").notNull().default(0),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    /** Per i codici di verifica di una richiesta di contatto. */
    leadId: uuid("lead_id"),
    createdAt: createdAt(),
  },
  (t) => [index("otp_target_idx").on(t.target, t.purpose)],
);

// ---------------------------------------------------------------------------
// Territorio (codici ISTAT)
// ---------------------------------------------------------------------------

export const regions = pgTable("regions", {
  id: smallint("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  active: boolean("active").notNull().default(false),
});

export const provinces = pgTable("provinces", {
  id: smallint("id").primaryKey(),
  regionId: smallint("region_id")
    .notNull()
    .references(() => regions.id),
  code: text("code").notNull().unique(), // sigla, es. PD
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
});

export const municipalities = pgTable(
  "municipalities",
  {
    id: integer("id").primaryKey(), // codice ISTAT numerico
    provinceId: smallint("province_id")
      .notNull()
      .references(() => provinces.id),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    /** Località e frazioni con cui le persone cercano il comune (es. Mestre → Venezia). */
    aliases: text("aliases").array().notNull().default([]),
    lat: doublePrecision("lat").notNull(),
    lng: doublePrecision("lng").notNull(),
  },
  (t) => [index("municipalities_province_idx").on(t.provinceId)],
);

// ---------------------------------------------------------------------------
// Tassonomia: categorie → servizi, domande dinamiche del modulo
// ---------------------------------------------------------------------------

export const partnerType = pgEnum("partner_type", ["agency", "technician", "artisan", "b2b"]);
export const priceUnit = pgEnum("price_unit", ["flat", "sqm", "hour", "visit", "percent", "month", "unit"]);

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  partnerType: partnerType("partner_type").notNull(),
  name: text("name").notNull(),
  /** Nome al plurale per titoli come "Idraulici a Padova". */
  pluralName: text("plural_name").notNull(),
  slug: text("slug").notNull().unique(),
  icon: text("icon").notNull().default("wrench"),
  sortOrder: smallint("sort_order").notNull().default(0),
});

export const services = pgTable(
  "services",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    defaultUnit: priceUnit("default_unit").notNull().default("flat"),
  },
  (t) => [uniqueIndex("services_category_slug_idx").on(t.categoryId, t.slug)],
);

export const questionType = pgEnum("question_type", ["text", "textarea", "number", "select"]);

export type QuestionOption = { value: string; label: string };

export const serviceQuestions = pgTable(
  "service_questions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    /** Se valorizzato la domanda vale solo per quel servizio, altrimenti per tutta la categoria. */
    serviceId: uuid("service_id").references(() => services.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    label: text("label").notNull(),
    help: text("help"),
    type: questionType("type").notNull(),
    options: jsonb("options").$type<QuestionOption[]>(),
    required: boolean("required").notNull().default(false),
    sortOrder: smallint("sort_order").notNull().default(0),
  },
  (t) => [index("service_questions_category_idx").on(t.categoryId)],
);

// ---------------------------------------------------------------------------
// Partner
// ---------------------------------------------------------------------------

export const verificationStatus = pgEnum("verification_status", ["pending", "verified", "rejected"]);
export const accountStatus = pgEnum("account_status", ["activating", "active", "suspended", "cancelled"]);

export const partners = pgTable(
  "partners",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: partnerType("type").notNull(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id),
    businessName: text("business_name").notNull(),
    displayName: text("display_name").notNull(),
    slug: text("slug").notNull().unique(),
    vatNumber: text("vat_number").notNull(),
    taxCode: text("tax_code"),
    sdiCode: text("sdi_code"),
    pec: text("pec"),
    address: text("address"),
    municipalityId: integer("municipality_id")
      .notNull()
      .references(() => municipalities.id),
    lat: doublePrecision("lat").notNull(),
    lng: doublePrecision("lng").notNull(),
    tagline: text("tagline").notNull(),
    description: text("description").notNull(),
    specialties: text("specialties").array().notNull().default([]),
    foundedYear: smallint("founded_year"),
    phone: text("phone"),
    email: text("email"),
    /** Foto profilo / logo caricato dal partner (URL pubblico). */
    logoUrl: text("logo_url"),
    /** Se vero i contatti diretti restano nascosti e le richieste passano solo dal modulo. */
    hideDirectContacts: boolean("hide_direct_contacts").notNull().default(true),
    openingHours: jsonb("opening_hours").$type<{ label: string; value: string }[]>().notNull().default([]),
    /** Tempo medio di risposta misurato, in minuti. */
    responseMinutes: integer("response_minutes"),
    verificationStatus: verificationStatus("verification_status").notNull().default("pending"),
    accountStatus: accountStatus("account_status").notNull().default("activating"),
    completeness: smallint("completeness").notNull().default(0),
    /** Cliente Stripe del partner, creato al primo pagamento. */
    stripeCustomerId: text("stripe_customer_id").unique(),
    /** Storico: scheda Google Maps per le recensioni Google, tolte dal sito l'11/11/2026. Il codice non la usa più. */
    googlePlaceId: text("google_place_id"),
    createdAt: createdAt(),
  },
  (t) => [
    index("partners_category_idx").on(t.categoryId),
    index("partners_municipality_idx").on(t.municipalityId),
  ],
);

/** Eventi per le statistiche della scheda: comparsa nei risultati, apertura del profilo, apertura del modulo di contatto. */
export const profileEventType = pgEnum("profile_event_type", ["impression", "view", "contact_click"]);

// ponytail: una riga per evento; passare a contatori giornalieri quando il volume lo richiede.
export const profileEvents = pgTable(
  "profile_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    partnerId: uuid("partner_id")
      .notNull()
      .references(() => partners.id, { onDelete: "cascade" }),
    type: profileEventType("type").notNull(),
    /** Impronta giornaliera del visitatore (visitorKey) per le visite dal browser; null per le impressioni. */
    visitor: text("visitor"),
    createdAt: createdAt(),
  },
  (t) => [
    index("profile_events_partner_idx").on(t.partnerId, t.createdAt),
    index("profile_events_visitor_idx").on(t.partnerId, t.visitor),
  ],
);

export const memberRole = pgEnum("member_role", ["owner", "member"]);

export const partnerMembers = pgTable(
  "partner_members",
  {
    partnerId: uuid("partner_id")
      .notNull()
      .references(() => partners.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: memberRole("role").notNull().default("member"),
  },
  (t) => [primaryKey({ columns: [t.partnerId, t.userId] })],
);

/** Zone servite: un comune oppure un'intera provincia. */
export const serviceAreas = pgTable(
  "service_areas",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    partnerId: uuid("partner_id")
      .notNull()
      .references(() => partners.id, { onDelete: "cascade" }),
    municipalityId: integer("municipality_id").references(() => municipalities.id),
    provinceId: smallint("province_id").references(() => provinces.id),
  },
  (t) => [index("service_areas_partner_idx").on(t.partnerId)],
);

/** Listino prezzi indicativi (PRD §6.3). */
export const partnerServices = pgTable(
  "partner_services",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    partnerId: uuid("partner_id")
      .notNull()
      .references(() => partners.id, { onDelete: "cascade" }),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id),
    /** Importi in centesimi di euro, oppure punti base per le percentuali. */
    priceFrom: integer("price_from"),
    priceTo: integer("price_to"),
    unit: priceUnit("unit").notNull(),
    notes: text("notes"),
    sortOrder: smallint("sort_order").notNull().default(0),
  },
  (t) => [uniqueIndex("partner_services_unique").on(t.partnerId, t.serviceId)],
);

export const portfolioKind = pgEnum("portfolio_kind", ["work", "property"]);
/** Elenco e etichette in src/lib/domain/property-contract.ts. */
export const propertyContract = pgEnum("property_contract", ["sale", "rent", "auction", "rent_to_buy", "bare_ownership", "transitional_rent"]);
export const propertyStatus = pgEnum("property_status", ["available", "negotiating", "sold"]);

export const portfolioItems = pgTable(
  "portfolio_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    partnerId: uuid("partner_id")
      .notNull()
      .references(() => partners.id, { onDelete: "cascade" }),
    kind: portfolioKind("kind").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    municipalityId: integer("municipality_id").references(() => municipalities.id),
    contract: propertyContract("contract"),
    priceCents: integer("price_cents"),
    sqm: integer("sqm"),
    rooms: smallint("rooms"),
    status: propertyStatus("status"),
    /** Copertina: la prima di `photos` (resta per le pagine che mostrano una sola foto). */
    imageUrl: text("image_url"),
    /** Foto del progetto, da 2 a 8 per i nuovi (12/11/2026); i vecchi ne hanno al massimo una. */
    photos: text("photos").array().notNull().default([]),
    hasBeforeAfter: boolean("has_before_after").notNull().default(false),
    /** Link YouTube o Vimeo, solo piano Premium (documento del 4/11/2026). */
    videoUrl: text("video_url"),
    sortOrder: smallint("sort_order").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index("portfolio_partner_idx").on(t.partnerId)],
);

// ---------------------------------------------------------------------------
// Lead (richieste di contatto)
// ---------------------------------------------------------------------------

export const leadStatus = pgEnum("lead_status", ["new", "seen", "contacted", "quote_sent", "won", "lost"]);
/** Come è stato conteggiato il lead (PRD §7.4). */
export const leadCharge = pgEnum("lead_charge", ["pending", "quota", "token", "locked", "expired", "duplicate", "refunded"]);
export const reportStatus = pgEnum("report_status", ["open", "accepted", "rejected"]);

export type LeadAnswer = { key: string; label: string; value: string };

export const leads = pgTable(
  "leads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    partnerId: uuid("partner_id")
      .notNull()
      .references(() => partners.id),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id),
    serviceId: uuid("service_id").references(() => services.id),
    municipalityId: integer("municipality_id")
      .notNull()
      .references(() => municipalities.id),
    requestType: text("request_type").notNull(),
    answers: jsonb("answers").$type<LeadAnswer[]>().notNull().default([]),
    description: text("description"),
    timing: text("timing").notNull(),
    callbackSlot: text("callback_slot").notNull(),
    clientName: text("client_name").notNull(),
    clientEmail: text("client_email").notNull(),
    clientPhone: text("client_phone").notNull(),
    privacyConsent: boolean("privacy_consent").notNull(),
    marketingConsent: boolean("marketing_consent").notNull().default(false),
    status: leadStatus("status").notNull().default("new"),
    charge: leadCharge("charge").notNull().default("pending"),
    tokensCharged: integer("tokens_charged").notNull().default(0),
    /** Lead oltre quota con contatti nascosti: scadenza per lo sblocco con token. */
    unlockExpiresAt: timestamp("unlock_expires_at", { withTimezone: true }),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    reportReason: text("report_reason"),
    reportStatus: reportStatus("report_status"),
    reportedAt: timestamp("reported_at", { withTimezone: true }),
    notes: text("notes"),
    /** Email "Com'è andata?" al cliente, qualche giorno dopo la consegna (lead-follow-up.ts). */
    followUpSentAt: timestamp("follow_up_sent_at", { withTimezone: true }),
    /** Risposta del cliente: true = l'azienda l'ha ricontattato, false = no, null = nessuna risposta. */
    clientContacted: boolean("client_contacted"),
    clientAnsweredAt: timestamp("client_answered_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    index("leads_partner_idx").on(t.partnerId, t.createdAt),
    index("leads_duplicate_idx").on(t.partnerId, t.clientPhone),
    index("leads_created_idx").on(t.createdAt),
  ],
);

export const leadEvents = pgTable(
  "lead_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    message: text("message").notNull(),
    actor: text("actor").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("lead_events_lead_idx").on(t.leadId, t.createdAt)],
);

// ---------------------------------------------------------------------------
// Recensioni: tolte dal sito l'11/11/2026, la tabella resta solo come storico (il codice non la legge più)
// ---------------------------------------------------------------------------

export const reviewStatus = pgEnum("review_status", ["published", "flagged", "hidden"]);

export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    partnerId: uuid("partner_id")
      .notNull()
      .references(() => partners.id, { onDelete: "cascade" }),
    /** Solo chi ha inviato un lead verificato può recensire: un lead, una recensione. */
    leadId: uuid("lead_id").references(() => leads.id),
    authorName: text("author_name").notNull(),
    rating: smallint("rating").notNull(),
    quality: smallint("quality").notNull(),
    punctuality: smallint("punctuality").notNull(),
    value: smallint("value").notNull(),
    communication: smallint("communication").notNull(),
    text: text("text").notNull(),
    partnerReply: text("partner_reply"),
    status: reviewStatus("status").notNull().default("published"),
    createdAt: createdAt(),
  },
  (t) => [index("reviews_partner_idx").on(t.partnerId), uniqueIndex("reviews_lead_unique").on(t.leadId)],
);

// ---------------------------------------------------------------------------
// Piani, abbonamenti, token
// ---------------------------------------------------------------------------

export const billingPeriod = pgEnum("billing_period", ["monthly", "yearly"]);
export const subscriptionStatus = pgEnum("subscription_status", ["activating", "active", "suspended", "cancelled"]);

export const plans = pgTable("plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  monthlyPriceCents: integer("monthly_price_cents").notNull(),
  yearlyPriceCents: integer("yearly_price_cents").notNull(),
  leadsIncluded: integer("leads_included").notNull(),
  visibilityWeight: smallint("visibility_weight").notNull(),
  maxProvinces: smallint("max_provinces").notNull(),
  maxServices: integer("max_services"),
  maxPortfolioItems: integer("max_portfolio_items"),
  maxUsers: smallint("max_users").notNull(),
  renewalTokens: integer("renewal_tokens").notNull().default(0),
  featuredSlots: boolean("featured_slots").notNull().default(false),
  stripeMonthlyPriceId: text("stripe_monthly_price_id"),
  stripeYearlyPriceId: text("stripe_yearly_price_id"),
});

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    partnerId: uuid("partner_id")
      .notNull()
      .references(() => partners.id, { onDelete: "cascade" }),
    planId: uuid("plan_id")
      .notNull()
      .references(() => plans.id),
    period: billingPeriod("period").notNull(),
    status: subscriptionStatus("status").notNull(),
    currentPeriodStart: timestamp("current_period_start", { withTimezone: true }).notNull(),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }).notNull(),
    leadsUsed: integer("leads_used").notNull().default(0),
    autoUseTokens: boolean("auto_use_tokens").notNull().default(false),
    /** Piano gratuito di lancio (free-plan.ts): Base senza Stripe, 3 richieste con i contatti al mese. */
    free: boolean("free").notNull().default(false),
    stripeSubscriptionId: text("stripe_subscription_id").unique(),
    createdAt: createdAt(),
  },
  (t) => [index("subscriptions_partner_idx").on(t.partnerId)],
);

/**
 * Operazioni Stripe già eseguite: id degli eventi webhook e chiavi di evasione (es. accredito di un
 * Checkout). La riga si inserisce nella stessa transazione dell'effetto, così un evento ripetuto
 * non accredita due volte.
 */
export const stripeProcessed = pgTable("stripe_processed", {
  key: text("key").primaryKey(),
  createdAt: createdAt(),
});

export const tokenEntryKind = pgEnum("token_entry_kind", ["purchase", "credit", "consume", "expire", "refund"]);

/**
 * Registro token immutabile (PRD §7.3): il saldo si ricostruisce sempre da qui.
 * Gli accrediti (purchase, credit, refund) aprono un lotto con scadenza; i consumi e le
 * scadenze puntano al lotto da cui scalano, così si consumano prima i token più vecchi.
 */
export const tokenLedger = pgTable(
  "token_ledger",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    partnerId: uuid("partner_id")
      .notNull()
      .references(() => partners.id, { onDelete: "cascade" }),
    kind: tokenEntryKind("kind").notNull(),
    /** Positivo per gli accrediti, negativo per consumi e scadenze. */
    amount: integer("amount").notNull(),
    lotId: uuid("lot_id"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    reference: text("reference").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("token_ledger_partner_idx").on(t.partnerId, t.createdAt)],
);

/** Dove si vede il boost: "search" = Sponsorizzato nella ricerca (riquadro grande / primi posti), "home" = logo nella fascia Aziende in evidenza. */
export const boostPlacement = pgEnum("boost_placement", ["search", "home"]);

export const boosts = pgTable(
  "boosts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    partnerId: uuid("partner_id")
      .notNull()
      .references(() => partners.id, { onDelete: "cascade" }),
    placement: boostPlacement("placement").notNull().default("search"),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id),
    provinceId: smallint("province_id")
      .notNull()
      .references(() => provinces.id),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    tokensSpent: integer("tokens_spent").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("boosts_lookup_idx").on(t.categoryId, t.provinceId, t.endsAt)],
);

/** Espansione "spot" a una provincia vicina, pagata a token (30 giorni): la scheda compare anche lì. */
export const areaExtensions = pgTable(
  "area_extensions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    partnerId: uuid("partner_id")
      .notNull()
      .references(() => partners.id, { onDelete: "cascade" }),
    /** Comune in cui la scheda compare in più, pagato in euro (49 € per 30 giorni, decisione dei soci 10/11/2026). */
    municipalityId: integer("municipality_id")
      .notNull()
      .references(() => municipalities.id),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    tokensSpent: integer("tokens_spent").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("area_extensions_municipality_idx").on(t.municipalityId, t.endsAt)],
);

/** Lavoro del portfolio messo in evidenza nella pagina "Ispirazione", pagato a token (7 o 30 giorni). */
export const showcaseFeatures = pgTable(
  "showcase_features",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    partnerId: uuid("partner_id")
      .notNull()
      .references(() => partners.id, { onDelete: "cascade" }),
    portfolioItemId: uuid("portfolio_item_id")
      .notNull()
      .references(() => portfolioItems.id, { onDelete: "cascade" }),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    tokensSpent: integer("tokens_spent").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("showcase_features_ends_idx").on(t.endsAt)],
);

// ---------------------------------------------------------------------------
// Assistenza: ticket da modulo del sito, Area Partner ed email
// ---------------------------------------------------------------------------

export const ticketStatus = pgEnum("ticket_status", ["open", "waiting", "resolved"]);
export const ticketChannel = pgEnum("ticket_channel", ["web", "email", "partner_area"]);
/** inbound: da cliente o partner; reply: risposta dell'assistenza (va anche per email); note: interna, mai mostrata. */
export const ticketMessageKind = pgEnum("ticket_message_kind", ["inbound", "reply", "note"]);

export const supportTickets = pgTable(
  "support_tickets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Numero mostrato a chi scrive e messo nell'oggetto delle email ([geco #12]) per legare le risposte. */
    number: serial("number").notNull().unique(),
    subject: text("subject").notNull(),
    topic: text("topic").notNull().default("other"),
    status: ticketStatus("status").notNull().default("open"),
    channel: ticketChannel("channel").notNull(),
    requesterName: text("requester_name").notNull(),
    requesterEmail: text("requester_email").notNull(),
    /** Account e azienda di chi scrive, riconosciuti dall'email o dalla sessione. */
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    partnerId: uuid("partner_id").references(() => partners.id, { onDelete: "set null" }),
    /**
     * Aperto da dentro l'account (sessione), quindi con l'identità verificata. Solo questi compaiono in Area Partner e
     * nell'area cliente: dal modulo pubblico o per email chiunque può scrivere con l'email di un altro (20/11/2026).
     */
    openedFromAccount: boolean("opened_from_account").notNull().default(false),
    assigneeId: uuid("assignee_id").references(() => users.id, { onDelete: "set null" }),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: createdAt(),
  },
  (t) => [
    index("support_tickets_status_idx").on(t.status, t.lastMessageAt),
    index("support_tickets_partner_idx").on(t.partnerId),
    index("support_tickets_requester_idx").on(t.requesterEmail),
  ],
);

export const supportMessages = pgTable(
  "support_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ticketId: uuid("ticket_id")
      .notNull()
      .references(() => supportTickets.id, { onDelete: "cascade" }),
    kind: ticketMessageKind("kind").notNull(),
    authorName: text("author_name").notNull(),
    authorUserId: uuid("author_user_id").references(() => users.id, { onDelete: "set null" }),
    body: text("body").notNull(),
    /** Message-ID dell'email in arrivo: la stessa email consegnata due volte non crea due messaggi. */
    emailMessageId: text("email_message_id").unique(),
    createdAt: createdAt(),
  },
  (t) => [index("support_messages_ticket_idx").on(t.ticketId, t.createdAt)],
);

// ---------------------------------------------------------------------------
// Audit
// ---------------------------------------------------------------------------

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actor: text("actor").notNull(),
    action: text("action").notNull(),
    entity: text("entity").notNull(),
    entityId: text("entity_id"),
    data: jsonb("data"),
    createdAt: createdAt(),
  },
  (t) => [index("audit_logs_entity_idx").on(t.entity, t.entityId), index("audit_logs_created_idx").on(t.createdAt)],
);
