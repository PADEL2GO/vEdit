export interface Lobby {
  id: string;
  host_user_id: string;
  booking_id: string | null;
  location_id: string;
  court_id: string;
  start_time: string;
  end_time: string;
  status: 'open' | 'full' | 'cancelled' | 'expired' | 'completed';
  capacity: number;
  skill_min: number;
  skill_max: number;
  price_total_cents: number;
  price_per_player_cents: number;
  currency: string;
  description: string | null;
  is_private: boolean;
  created_at: string;
  updated_at: string;
  
  // Joined data
  locations?: {
    name: string;
    slug: string;
    city: string | null;
    address: string | null;
  };
  courts?: {
    name: string;
  };
  
  // Computed
  members_count?: number;
  paid_count?: number;
  spots_available?: number;
  avg_skill?: number;
  members?: LobbyMember[];
}

export interface LobbyMember {
  id: string;
  lobby_id: string;
  user_id: string;
  status: 'reserved' | 'joined' | 'paid' | 'cancelled' | 'expired';
  reserved_until: string | null;
  payment_intent_id: string | null;
  stripe_checkout_session_id: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
  
  // Joined data
  profiles?: {
    display_name: string | null;
    avatar_url: string | null;
    username: string | null;
  };
  skill_level?: number;
}

export interface LobbyFilters {
  location_id?: string;
  date_from?: string;
  date_to?: string;
  skill_min?: number;
  skill_max?: number;
  only_available?: boolean;
}

export interface LobbySettings {
  capacity: 2 | 4;
  skillRange: [number, number];
  isPublic: boolean;
  description?: string;
}

export const DEFAULT_LOBBY_SETTINGS: LobbySettings = {
  capacity: 4,
  skillRange: [4, 6],
  isPublic: true,
  description: "",
};

export interface CreateLobbyPayload {
  booking_id?: string;
  location_id: string;
  court_id: string;
  start_time: string;
  end_time: string;
  capacity?: number;
  skill_min?: number;
  skill_max?: number;
  price_total_cents: number;
  is_private?: boolean;
  description?: string;
}
