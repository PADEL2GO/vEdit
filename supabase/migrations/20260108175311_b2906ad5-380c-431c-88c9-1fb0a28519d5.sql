-- Drop the existing check constraint
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Add the updated check constraint including all existing types plus 'admin_broadcast'
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check 
CHECK (type IN (
  'booking_reminder',
  'booking_confirmation', 
  'booking_cancelled',
  'friend_request_received',
  'friend_request_accepted',
  'reward_earned',
  'level_up',
  'match_suggestion',
  'event_reminder',
  'system',
  'admin_broadcast',
  'REWARD_CLAIMED',
  'REWARD_AVAILABLE',
  'REWARD_EARNED'
));