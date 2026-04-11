-- Add new columns to wallets table for lifetime credits and last game tracking
ALTER TABLE public.wallets 
ADD COLUMN lifetime_credits integer NOT NULL DEFAULT 0,
ADD COLUMN last_game_credits integer DEFAULT NULL,
ADD COLUMN last_game_date timestamp with time zone DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.wallets.lifetime_credits IS 'Total credits ever earned - never decreases, used for league ranking';
COMMENT ON COLUMN public.wallets.last_game_credits IS 'Credits earned from the most recent game';
COMMENT ON COLUMN public.wallets.last_game_date IS 'Date of the most recent game';