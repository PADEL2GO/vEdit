// Re-export shared constants for backwards compatibility
export { WEEKDAYS } from "@/types/constants";
// Re-export centralized query keys
export { QUERY_KEYS } from "@/lib/queryKeys";

export interface Location {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  description: string | null;
  is_online: boolean;
  is_24_7: boolean;
  amenities: string[];
  postal_code: string | null;
  city: string | null;
  country: string;
  lat: number | null;
  lng: number | null;
  main_image_url: string | null;
  gallery_image_urls: string[];
  opening_hours_json: Record<string, { open: string; close: string }>;
  rewards_enabled: boolean;
  ai_analysis_enabled: boolean;
  vending_enabled: boolean;
  features_json: {
    wifi?: boolean;
    accessible?: boolean;
    family_friendly?: boolean;
  } | null;
  courts: { id: string; name: string; is_active: boolean; location_id: string }[];
}
