CREATE POLICY "Club members can view bookings for their assigned courts"
ON public.bookings
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.club_court_assignments cca
    WHERE cca.court_id = bookings.court_id
      AND cca.club_id = get_user_club_id(auth.uid())
  )
);