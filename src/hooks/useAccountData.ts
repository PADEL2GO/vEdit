import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import type { PlayerAnalyticsData } from "@/components/analytics/types";
import type { Profile, Wallet, SkillStats, AnalyticsState } from "@/components/account/types";

// Re-export types for convenience
export type { Profile, Wallet, SkillStats, AnalyticsState };

const DEFAULT_PROFILE: Profile = {
  username: null,
  display_name: null,
  age: null,
  avatar_url: null,
  games_played_self: 0,
  skill_self_rating: 5,
  shipping_address_line1: null,
  shipping_postal_code: null,
  shipping_city: null,
  shipping_country: null,
};

const DEFAULT_WALLET: Wallet = { 
  play_credits: 0, 
  reward_credits: 0, 
  lifetime_credits: 0,
  last_game_credits: null,
  last_game_date: null,
};
const DEFAULT_SKILL_STATS: SkillStats = { skill_level: 0, ai_rank: null, last_ai_update: null };
const DEFAULT_ANALYTICS: AnalyticsState = { hasAiData: false, data: null };

interface UseAccountDataResult {
  loading: boolean;
  profile: Profile;
  setProfile: React.Dispatch<React.SetStateAction<Profile>>;
  wallet: Wallet;
  updateWallet: (updates: Partial<Wallet>) => void;
  skillStats: SkillStats;
  analytics: AnalyticsState;
  refetch: () => Promise<void>;
}

export function useAccountData(user: User | null): UseAccountDataResult {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [wallet, setWallet] = useState<Wallet>(DEFAULT_WALLET);
  const [skillStats, setSkillStats] = useState<SkillStats>(DEFAULT_SKILL_STATS);
  const [analytics, setAnalytics] = useState<AnalyticsState>(DEFAULT_ANALYTICS);

  const fetchUserData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    setLoading(true);

    try {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileError) throw profileError;
      if (profileData) {
        setProfile({
          username: profileData.username,
          display_name: profileData.display_name,
          age: profileData.age,
          avatar_url: profileData.avatar_url,
          games_played_self: profileData.games_played_self ?? 0,
          skill_self_rating: profileData.skill_self_rating ?? 5,
          shipping_address_line1: profileData.shipping_address_line1 ?? null,
          shipping_postal_code: profileData.shipping_postal_code ?? null,
          shipping_city: profileData.shipping_city ?? null,
          shipping_country: profileData.shipping_country ?? null,
        });
      }

      const { data: walletData, error: walletError } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (walletError) throw walletError;
      if (walletData) {
        setWallet({
          play_credits: walletData.play_credits,
          reward_credits: walletData.reward_credits,
          lifetime_credits: walletData.lifetime_credits ?? 0,
          last_game_credits: walletData.last_game_credits ?? null,
          last_game_date: walletData.last_game_date ?? null,
        });
      }

      const { data: skillData, error: skillError } = await supabase
        .from("skill_stats")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (skillError) throw skillError;
      if (skillData) {
        setSkillStats({
          skill_level: skillData.skill_level ?? 0,
          ai_rank: skillData.ai_rank,
          last_ai_update: skillData.last_ai_update,
        });
      }

      const { data: analyticsData, error: analyticsError } = await supabase
        .from("ai_player_analytics")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!analyticsError && analyticsData) {
        const hasData = analyticsData.has_ai_data && analyticsData.data && Object.keys(analyticsData.data).length > 0;
        setAnalytics({
          hasAiData: hasData,
          data: hasData ? (analyticsData.data as unknown as PlayerAnalyticsData) : null,
        });
      }
    } catch (error: any) {
      console.error("Error fetching user data:", error);
      toast.error("Fehler", { description: "Konnte Profildaten nicht laden." });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchUserData();
    } else {
      setLoading(false);
    }
  }, [user, fetchUserData]);

  const updateWallet = useCallback((updates: Partial<Wallet>) => {
    setWallet((prev) => ({ ...prev, ...updates }));
  }, []);

  return {
    loading,
    profile,
    setProfile,
    wallet,
    updateWallet,
    skillStats,
    analytics,
    refetch: fetchUserData,
  };
}