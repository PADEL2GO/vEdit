-- Create participant_status enum
CREATE TYPE participant_status AS ENUM ('pending_invite', 'accepted', 'declined', 'paid');

-- Create booking_participants table for invites
CREATE TABLE public.booking_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  inviter_user_id UUID NOT NULL,
  invited_user_id UUID NOT NULL,
  invited_username TEXT NOT NULL,
  status participant_status NOT NULL DEFAULT 'pending_invite',
  share_fraction NUMERIC(3,2) DEFAULT 0.25, -- Default 1/4 for 4 players
  share_price_cents INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  paid_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(booking_id, invited_user_id)
);

-- Enable RLS
ALTER TABLE public.booking_participants ENABLE ROW LEVEL SECURITY;

-- RLS: Booking owner can create invites for their bookings
CREATE POLICY "Booking owner can create invites"
ON public.booking_participants
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.bookings
    WHERE bookings.id = booking_participants.booking_id
    AND bookings.user_id = auth.uid()
  )
  AND inviter_user_id = auth.uid()
);

-- RLS: Booking owner can read all participants for their booking
CREATE POLICY "Booking owner can read participants"
ON public.booking_participants
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.bookings
    WHERE bookings.id = booking_participants.booking_id
    AND bookings.user_id = auth.uid()
  )
);

-- RLS: Invited user can read their own invites
CREATE POLICY "Invited user can read own invites"
ON public.booking_participants
FOR SELECT
USING (invited_user_id = auth.uid());

-- RLS: Invited user can update their own invite (accept/decline)
CREATE POLICY "Invited user can update own invite"
ON public.booking_participants
FOR UPDATE
USING (invited_user_id = auth.uid())
WITH CHECK (invited_user_id = auth.uid());

-- RLS: Booking owner can delete invites for their booking
CREATE POLICY "Booking owner can delete invites"
ON public.booking_participants
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.bookings
    WHERE bookings.id = booking_participants.booking_id
    AND bookings.user_id = auth.uid()
  )
);

-- Add index for faster username searches
CREATE INDEX IF NOT EXISTS idx_profiles_username_lower ON public.profiles (LOWER(username));

-- Add index for faster invite lookups
CREATE INDEX idx_booking_participants_invited_user ON public.booking_participants (invited_user_id, status);
CREATE INDEX idx_booking_participants_booking ON public.booking_participants (booking_id);

-- Add payment_mode to bookings table for split vs full payment
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS payment_mode TEXT DEFAULT 'full' CHECK (payment_mode IN ('full', 'split'));

-- Trigger to update updated_at
CREATE TRIGGER update_booking_participants_updated_at
BEFORE UPDATE ON public.booking_participants
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();