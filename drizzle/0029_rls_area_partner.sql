-- RLS dell'Area Partner: le query delle aziende girano come ruolo geco_partner (asPartner in src/lib/db/tenant.ts),
-- che vede e modifica solo le righe dell'azienda in app.partner_id, anche se nel codice manca un filtro.
-- Il ruolo dell'app resta proprietario delle tabelle e non è soggetto a RLS (pagine pubbliche, gestionale, Stripe).
-- Utenti, sessioni, codici, pagamenti già elaborati e registro attività restano chiusi al ruolo.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'geco_partner') THEN
    CREATE ROLE geco_partner NOLOGIN NOINHERIT NOBYPASSRLS;
  END IF;
END $$;--> statement-breakpoint
GRANT geco_partner TO CURRENT_USER;--> statement-breakpoint
GRANT USAGE ON SCHEMA public TO geco_partner;--> statement-breakpoint
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO geco_partner;--> statement-breakpoint
-- Usata nelle policy come (SELECT app_partner_id()): calcolata una volta per query, non riga per riga.
CREATE OR REPLACE FUNCTION app_partner_id() RETURNS uuid LANGUAGE sql STABLE SET search_path = ''
  AS $$ SELECT nullif(pg_catalog.current_setting('app.partner_id', true), '')::uuid $$;--> statement-breakpoint

-- Dati di riferimento: in sola lettura, tutte le righe.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['regions', 'provinces', 'municipalities', 'categories', 'services', 'service_questions', 'plans'] LOOP
    EXECUTE format('GRANT SELECT ON public.%I TO geco_partner', t);
    EXECUTE format('CREATE POLICY geco_partner_read ON public.%I FOR SELECT TO geco_partner USING (true)', t);
  END LOOP;
END $$;--> statement-breakpoint

-- Righe dell'azienda: solo le sue, e non si possono spostare su un'altra.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['partner_members', 'service_areas', 'partner_services', 'portfolio_items', 'leads', 'reviews',
    'subscriptions', 'token_ledger', 'boosts', 'area_extensions', 'showcase_features', 'profile_events', 'support_tickets'] LOOP
    EXECUTE format('CREATE POLICY geco_partner_own ON public.%I TO geco_partner USING (partner_id = (SELECT app_partner_id())) WITH CHECK (partner_id = (SELECT app_partner_id()))', t);
  END LOOP;
END $$;--> statement-breakpoint
CREATE POLICY geco_partner_own ON partners TO geco_partner USING (id = (SELECT app_partner_id())) WITH CHECK (id = (SELECT app_partner_id()));--> statement-breakpoint
CREATE POLICY geco_partner_own ON lead_events TO geco_partner
  USING (lead_id IN (SELECT id FROM leads)) WITH CHECK (lead_id IN (SELECT id FROM leads));--> statement-breakpoint
-- Le note interne del team sui ticket restano fuori anche per l'azienda del ticket.
CREATE POLICY geco_partner_own ON support_messages TO geco_partner
  USING (kind <> 'note' AND ticket_id IN (SELECT id FROM support_tickets))
  WITH CHECK (kind <> 'note' AND ticket_id IN (SELECT id FROM support_tickets));--> statement-breakpoint

-- Cosa può fare il ruolo: solo quello che asPartner usa. Pagamenti, piani, sponsorizzazioni, statistiche, profilo
-- dell'azienda e ticket li scrive il server con il ruolo dell'app.
GRANT SELECT ON partners, partner_members, service_areas, reviews, subscriptions, token_ledger, boosts, area_extensions,
  showcase_features, profile_events, support_tickets, support_messages TO geco_partner;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON partner_services, portfolio_items TO geco_partner;--> statement-breakpoint
GRANT SELECT ON leads TO geco_partner;--> statement-breakpoint
GRANT UPDATE (status, notes, report_reason, report_status, reported_at) ON leads TO geco_partner;--> statement-breakpoint
GRANT SELECT, INSERT ON lead_events TO geco_partner;
