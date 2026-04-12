-- Phase 6: Legacy-Datenmigration von club_owner_assignments zu neuen Club-Strukturen
-- Skipped on fresh databases where the legacy user does not exist.
DO $$
DECLARE
  new_club_id UUID;
  legacy_user_id UUID := '0b16ffc1-2660-405d-9719-6bccd0151650';
  legacy_court_id UUID := '10827ab4-a308-441a-90be-35b28ee4a885';
  user_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE user_id = legacy_user_id
  ) INTO user_exists;

  IF NOT user_exists THEN
    RAISE NOTICE 'Legacy user not found — skipping club migration.';
    RETURN;
  END IF;

  -- 1. Club erstellen
  INSERT INTO clubs (name, description, primary_contact_email, is_active)
  SELECT
    'Club ' || COALESCE(p.display_name, p.username, 'Unbekannt'),
    'Automatisch migriert von club_owner_assignments',
    u.email,
    true
  FROM profiles p
  JOIN auth.users u ON u.id = p.user_id
  WHERE p.user_id = legacy_user_id
  RETURNING id INTO new_club_id;

  -- 2. Club-User als Manager hinzufügen
  INSERT INTO club_users (club_id, user_id, role_in_club, is_active)
  VALUES (new_club_id, legacy_user_id, 'manager', true);

  -- 3. Court-Zuweisung mit Kontingent erstellen
  INSERT INTO club_court_assignments (
    club_id, court_id, weekly_free_minutes,
    weekly_reset_weekday, allowed_booking_windows
  )
  SELECT
    new_club_id,
    court_id,
    weekly_free_minutes,
    weekly_reset_weekday,
    allowed_booking_windows
  FROM club_owner_assignments
  WHERE user_id = legacy_user_id AND court_id = legacy_court_id;

  RAISE NOTICE 'Migration erfolgreich! Neuer Club: %', new_club_id;
END $$;