-- Add bidirectional unique constraint to prevent duplicate friendships in either direction
-- First, clean up any potential duplicate friendships (keep the older one)
DELETE FROM friendships f1
WHERE EXISTS (
  SELECT 1 FROM friendships f2
  WHERE f2.id < f1.id
    AND LEAST(f1.requester_id, f1.addressee_id) = LEAST(f2.requester_id, f2.addressee_id)
    AND GREATEST(f1.requester_id, f1.addressee_id) = GREATEST(f2.requester_id, f2.addressee_id)
);

-- Create unique index that treats (A,B) and (B,A) as the same pair
CREATE UNIQUE INDEX IF NOT EXISTS unique_friendship_pair 
ON friendships (LEAST(requester_id, addressee_id), GREATEST(requester_id, addressee_id));