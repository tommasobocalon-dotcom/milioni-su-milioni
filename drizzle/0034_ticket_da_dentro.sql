-- Ticket dell'assistenza nelle aree private (AUDIT-SICUREZZA.md §11, punto 4): dal modulo pubblico o per email chiunque
-- può scrivere con l'email di un altro, e il ticket finiva nella sua Area Partner e nell'area cliente. Ora ci arrivano
-- solo i ticket aperti da dentro l'account (con la sessione); gli altri restano nel gestionale e proseguono per email.
ALTER TABLE "support_tickets" ADD COLUMN "opened_from_account" boolean DEFAULT false NOT NULL;--> statement-breakpoint
-- Ticket già esistenti: aperti da dentro se il primo messaggio porta l'utente della sessione (come verifiedSender nel gestionale).
UPDATE support_tickets t SET opened_from_account = true
WHERE (SELECT m.author_user_id FROM support_messages m WHERE m.ticket_id = t.id ORDER BY m.created_at, m.id LIMIT 1) IS NOT NULL;--> statement-breakpoint
-- Le policy delle aree private (migrazioni 0029 e 0032) mostrano solo questi; i messaggi seguono i loro ticket.
DROP POLICY geco_partner_own ON support_tickets;--> statement-breakpoint
CREATE POLICY geco_partner_own ON support_tickets TO geco_partner
  USING (partner_id = (SELECT app_partner_id()) AND opened_from_account)
  WITH CHECK (partner_id = (SELECT app_partner_id()));--> statement-breakpoint
GRANT SELECT (opened_from_account) ON support_tickets TO geco_client;--> statement-breakpoint
DROP POLICY geco_client_own ON support_tickets;--> statement-breakpoint
CREATE POLICY geco_client_own ON support_tickets FOR SELECT TO geco_client
  USING (user_id = (SELECT app_user_id()) AND opened_from_account);
