-- Add reminder tracking columns to bookings table
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS reminder_sent_24h TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS reminder_sent_1h TIMESTAMP WITH TIME ZONE;

-- Add index for reminder queries
CREATE INDEX IF NOT EXISTS idx_bookings_reminders ON public.bookings (status, reminder_sent_24h, reminder_sent_1h, start_time)
WHERE status = 'confirmed';