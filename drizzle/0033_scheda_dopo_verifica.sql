-- Dal 20/11/2026 una scheda è online solo con il piano attivo e i dati verificati dal team (listingStatus in
-- src/lib/domain/billing.ts). Le schede già online ma mai verificate tornano "in attivazione", nascoste: vanno online
-- appena il team le segna come verificate nel gestionale (Partner → scheda → "Segna come verificato").
UPDATE partners SET account_status = 'activating' WHERE account_status = 'active' AND verification_status <> 'verified';
