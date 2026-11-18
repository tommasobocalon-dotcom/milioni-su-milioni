-- RLS dell'Area cliente: le letture del cliente girano come ruolo geco_client (asClient in src/lib/db/tenant.ts), che vede
-- solo il proprio account e le richieste della propria email, e solo se l'email è confermata (app.user_email resta
-- vuota altrimenti). Colonne interne delle aziende (note, segnalazioni) e note del team restano fuori.
-- Cancellazione dell'account e registro attività restano sul ruolo dell'app (src/lib/data/client-data.ts).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'geco_client') THEN
    CREATE ROLE geco_client NOLOGIN NOINHERIT NOBYPASSRLS;
  END IF;
END $$;--> statement-breakpoint
GRANT geco_client TO CURRENT_USER;--> statement-breakpoint
GRANT USAGE ON SCHEMA public TO geco_client;--> statement-breakpoint
CREATE OR REPLACE FUNCTION app_user_id() RETURNS uuid LANGUAGE sql STABLE SET search_path = ''
  AS $$ SELECT nullif(pg_catalog.current_setting('app.user_id', true), '')::uuid $$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION app_user_email() RETURNS text LANGUAGE sql STABLE SET search_path = ''
  AS $$ SELECT nullif(pg_catalog.current_setting('app.user_email', true), '') $$;--> statement-breakpoint

GRANT SELECT ON categories, municipalities TO geco_client;--> statement-breakpoint
CREATE POLICY geco_client_read ON categories FOR SELECT TO geco_client USING (true);--> statement-breakpoint
CREATE POLICY geco_client_read ON municipalities FOR SELECT TO geco_client USING (true);--> statement-breakpoint

GRANT SELECT (id, email, phone, name, role, created_at, email_verified_at) ON users TO geco_client;--> statement-breakpoint
CREATE POLICY geco_client_own ON users FOR SELECT TO geco_client USING (id = (SELECT app_user_id()));--> statement-breakpoint

GRANT SELECT (id, partner_id, category_id, municipality_id, request_type, answers, description, timing, callback_slot, client_name,
  client_email, client_phone, privacy_consent, marketing_consent, status, verified_at, delivered_at, client_contacted, created_at)
  ON leads TO geco_client;--> statement-breakpoint
GRANT UPDATE (marketing_consent) ON leads TO geco_client;--> statement-breakpoint
CREATE POLICY geco_client_own ON leads TO geco_client
  USING (client_email = (SELECT app_user_email())) WITH CHECK (client_email = (SELECT app_user_email()));--> statement-breakpoint

-- Delle aziende solo il nome, e solo di quelle a cui il cliente ha scritto.
GRANT SELECT (id, display_name) ON partners TO geco_client;--> statement-breakpoint
CREATE POLICY geco_client_read ON partners FOR SELECT TO geco_client USING (id IN (SELECT partner_id FROM leads));--> statement-breakpoint

GRANT SELECT (provider, user_id, created_at) ON oauth_accounts TO geco_client;--> statement-breakpoint
CREATE POLICY geco_client_own ON oauth_accounts FOR SELECT TO geco_client USING (user_id = (SELECT app_user_id()));--> statement-breakpoint

GRANT SELECT (id, number, subject, status, user_id, created_at) ON support_tickets TO geco_client;--> statement-breakpoint
CREATE POLICY geco_client_own ON support_tickets FOR SELECT TO geco_client USING (user_id = (SELECT app_user_id()));--> statement-breakpoint
GRANT SELECT (ticket_id, kind, author_name, body, created_at) ON support_messages TO geco_client;--> statement-breakpoint
CREATE POLICY geco_client_own ON support_messages FOR SELECT TO geco_client
  USING (kind IN ('inbound', 'reply') AND ticket_id IN (SELECT id FROM support_tickets));--> statement-breakpoint

-- Area Partner: anche il profilo dell'azienda si modifica come geco_partner (updateProfile), solo nelle sue colonne.
-- Piano, stato dell'account, verifica, slug e dati di Stripe restano scritti solo dal server.
GRANT UPDATE (business_name, vat_number, address, tagline, description, phone, email, specialties, opening_hours, founded_year,
  hide_direct_contacts, logo_url) ON partners TO geco_partner;
