
-- Phase 1: Add club_owner to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'club_owner';

-- Phase 2: Create club_owner_assignments table
CREATE TABLE public.club_owner_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  court_id uuid NOT NULL REFERENCES public.courts(id) ON DELETE CASCADE,
  weekly_free_minutes integer NOT NULL DEFAULT 600,
  weekly_reset_weekday integer NOT NULL DEFAULT 1 CHECK (weekly_reset_weekday >= 1 AND weekly_reset_weekday <= 7),
  allowed_booking_windows jsonb DEFAULT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, court_id)
);

-- Phase 3: Extend bookings table for club bookings
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS booking_origin text NOT NULL DEFAULT 'user' CHECK (booking_origin IN ('user', 'club')),
ADD COLUMN IF NOT EXISTS club_owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS booked_for_member_name text,
ADD COLUMN IF NOT EXISTS booked_for_member_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_free_allocation boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS allocation_minutes integer,
ADD COLUMN IF NOT EXISTS notes text;

-- Phase 4: Create club_quota_ledger for robust quota tracking
CREATE TABLE public.club_quota_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  court_id uuid NOT NULL REFERENCES public.courts(id) ON DELETE CASCADE,
  week_start_date date NOT NULL,
  minutes_used integer NOT NULL DEFAULT 0,
  minutes_refunded integer NOT NULL DEFAULT 0,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_club_owner_assignments_user_id ON public.club_owner_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_club_owner_assignments_court_id ON public.club_owner_assignments(court_id);
CREATE INDEX IF NOT EXISTS idx_club_quota_ledger_club_owner ON public.club_quota_ledger(club_owner_id, week_start_date);
CREATE INDEX IF NOT EXISTS idx_club_quota_ledger_booking ON public.club_quota_ledger(booking_id);
CREATE INDEX IF NOT EXISTS idx_bookings_club_owner ON public.bookings(club_owner_id) WHERE booking_origin = 'club';

-- Trigger for updated_at on club_owner_assignments
CREATE TRIGGER update_club_owner_assignments_updated_at
  BEFORE UPDATE ON public.club_owner_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS on new tables
ALTER TABLE public.club_owner_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_quota_ledger ENABLE ROW LEVEL SECURITY;

-- RLS Policies for club_owner_assignments
CREATE POLICY "Admins can manage all club owner assignments"
  ON public.club_owner_assignments
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Club owners can view their own assignments"
  ON public.club_owner_assignments
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for club_quota_ledger
CREATE POLICY "Admins can manage all quota ledger entries"
  ON public.club_quota_ledger
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Club owners can view their own quota ledger"
  ON public.club_quota_ledger
  FOR SELECT
  TO authenticated
  USING (club_owner_id = auth.uid());

-- Allow service role to insert quota ledger entries (for edge functions)
CREATE POLICY "Service role can insert quota ledger"
  ON public.club_quota_ledger
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Extend bookings RLS for club owners to view their court bookings
CREATE POLICY "Club owners can view bookings for their assigned courts"
  ON public.bookings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.club_owner_assignments coa
      WHERE coa.user_id = auth.uid()
      AND coa.court_id = bookings.court_id
    )
  );

-- Club owners can create club bookings for their assigned courts
CREATE POLICY "Club owners can create club bookings for their courts"
  ON public.bookings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    booking_origin = 'club'
    AND club_owner_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.club_owner_assignments coa
      WHERE coa.user_id = auth.uid()
      AND coa.court_id = court_id
    )
  );

-- Club owners can cancel their own club bookings
CREATE POLICY "Club owners can update their club bookings"
  ON public.bookings
  FOR UPDATE
  TO authenticated
  USING (
    booking_origin = 'club'
    AND club_owner_id = auth.uid()
  )
  WITH CHECK (
    booking_origin = 'club'
    AND club_owner_id = auth.uid()
  );
