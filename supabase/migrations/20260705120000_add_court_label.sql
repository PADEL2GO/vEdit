-- Optionales, admin-pflegbares Kurz-Label pro Court (z. B. "Outdoor · Flutlicht", "Center Court").
-- Wird auf der Court-Auswahl im Booking-Flow angezeigt, wenn gesetzt. Null = kein Label.
ALTER TABLE public.courts
  ADD COLUMN IF NOT EXISTS label text;
