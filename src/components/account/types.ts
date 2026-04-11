/**
 * Account view model types - UI-specific shapes that omit user_id and timestamps.
 * These are derived from the database types but tailored for component consumption.
 * 
 * For full database entity types, see src/types/database.ts
 */

import type { PlayerAnalyticsData } from "@/components/analytics/types";

/** View model for profile data (omits user_id and timestamps) */
export interface Profile {
  username: string | null;
  display_name: string | null;
  age: number | null;
  avatar_url: string | null;
  games_played_self: number;
  skill_self_rating: number;
  shipping_address_line1: string | null;
  shipping_postal_code: string | null;
  shipping_city: string | null;
  shipping_country: string | null;
}

/** View model for wallet data (omits user_id and timestamps) */
export interface Wallet {
  play_credits: number;
  reward_credits: number;
  lifetime_credits: number;
  last_game_credits: number | null;
  last_game_date: string | null;
}

/** View model for skill stats (omits user_id) */
export interface SkillStats {
  skill_level: number;
  ai_rank: number | null;
  last_ai_update: string | null;
}

/** Analytics state for UI */
export interface AnalyticsState {
  hasAiData: boolean;
  data: PlayerAnalyticsData | null;
}
