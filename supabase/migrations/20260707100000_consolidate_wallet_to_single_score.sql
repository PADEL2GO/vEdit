-- Consolidate to a SINGLE P2G points score per player.
-- Going forward only booking payback (→ play_credits) earns points and the marketplace spends
-- them; rewards/referral/daily are not in use, so reward_credits is no longer tracked separately.
-- This one-time, row-atomic UPDATE folds any existing reward_credits into play_credits so
-- play_credits becomes the one score every surface already displays (play + reward).
-- lifetime_credits already includes reward credits (both earn paths wrote it), so it is untouched.
UPDATE public.wallets
SET play_credits   = play_credits + reward_credits,
    reward_credits = 0
WHERE reward_credits <> 0;
