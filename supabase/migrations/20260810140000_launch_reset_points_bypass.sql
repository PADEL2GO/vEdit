-- ============================================================================
-- Launch-Reset: kontrollierte Ausnahme vom points_ledger-Append-Only-Schutz
-- ============================================================================
-- Problem: `trg_points_ledger_guard` (Migration 20260726163000) blockt JEDES
-- DELETE auf points_ledger — auch für service_role. Das ist als Audit-Schutz
-- goldrichtig und soll bleiben. Für den einmaligen Launch-Reset (Testpunkte vor
-- dem Go-Live entfernen) braucht es aber genau einen sanktionierten Weg.
--
-- Lösung: Der Guard erlaubt DELETE zusätzlich dann, wenn das transaktionslokale
-- Flag `app.launch_reset` gesetzt ist. Gesetzt werden kann es ausschliesslich
-- von der SECURITY-DEFINER-Funktion unten, die nur service_role ausführen darf.
-- `set_config(..., is_local => true)` endet automatisch mit der Transaktion,
-- das Flag kann also nicht über den Aufruf hinaus wirken.
--
-- Der normale Betrieb bleibt unverändert append-only: es gibt weiterhin KEINE
-- DELETE-Policy auf points_ledger, ein Client kommt also gar nicht erst so weit.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.points_ledger_guard()
RETURNS trigger
LANGUAGE plpgsql
AS $ledger_guard$
BEGIN
  -- Unverändert: DSGVO-Anonymisierung (user_id auf NULL, sonst nichts)
  IF TG_OP = 'UPDATE'
     AND NEW.user_id IS NULL
     AND OLD.reward_instance_id IS NOT DISTINCT FROM NEW.reward_instance_id
     AND OLD.delta_points = NEW.delta_points
     AND OLD.entry_type = NEW.entry_type
     AND OLD.balance_after IS NOT DISTINCT FROM NEW.balance_after
     AND OLD.description IS NOT DISTINCT FROM NEW.description
     AND OLD.created_at IS NOT DISTINCT FROM NEW.created_at
  THEN
    RETURN NEW;
  END IF;

  -- NEU: sanktionierter Launch-Reset (nur aus launch_reset_wipe_points heraus)
  IF TG_OP = 'DELETE'
     AND coalesce(current_setting('app.launch_reset', true), '') = 'on'
  THEN
    RETURN OLD;
  END IF;

  RAISE EXCEPTION 'points_ledger is append-only (op %, row %)', TG_OP, OLD.id;
END;
$ledger_guard$;


-- ============================================================================
-- launch_reset_wipe_points() — leert Punkte-Ledger und Reward-Instanzen.
-- Reihenfolge zwingend: points_ledger zuerst, weil
-- points_ledger.reward_instance_id -> reward_instances(id) NO ACTION ist
-- (kein CASCADE) und die Reward-Instanzen sonst nicht löschbar wären.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.launch_reset_wipe_points()
RETURNS TABLE (table_name text, deleted bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $wipe$
DECLARE
  v_ledger  bigint;
  v_rewards bigint;
BEGIN
  -- Transaktionslokal: gilt nur innerhalb dieses Aufrufs
  PERFORM set_config('app.launch_reset', 'on', true);

  DELETE FROM public.points_ledger;
  GET DIAGNOSTICS v_ledger = ROW_COUNT;

  DELETE FROM public.reward_instances;
  GET DIAGNOSTICS v_rewards = ROW_COUNT;

  PERFORM set_config('app.launch_reset', 'off', true);

  RETURN QUERY
    SELECT 'points_ledger'::text, v_ledger
    UNION ALL
    SELECT 'reward_instances'::text, v_rewards;
END;
$wipe$;

COMMENT ON FUNCTION public.launch_reset_wipe_points() IS
  'Einmaliger Launch-Reset der Testpunkte. Einziger sanktionierter Weg am Append-Only-Guard vorbei; nur service_role.';

-- Ausschliesslich service_role (also nur unsere Edge Functions)
REVOKE ALL ON FUNCTION public.launch_reset_wipe_points() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.launch_reset_wipe_points() TO service_role;
