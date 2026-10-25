-- Supabase espone lo schema public anche tramite la sua Data API (ruoli anon e authenticated).
-- L'app non la usa: si collega come proprietaria delle tabelle, che non è soggetta a RLS.
-- RLS attiva senza policy chiude le tabelle esistenti agli altri ruoli; la revoca dei privilegi,
-- anche di quelli predefiniti, copre le tabelle create in futuro. In locale quei ruoli non esistono.
DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
    REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
  END IF;
END $$;
