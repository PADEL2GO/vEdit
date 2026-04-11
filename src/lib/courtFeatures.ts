/**
 * Zentrale Definition aller Court-Features
 * Wird von Club-Owner, Admin und Booking-Seite verwendet
 */

import { 
  Bath, 
  Droplets, 
  Shirt, 
  Lightbulb, 
  Car, 
  Wifi, 
  Accessibility, 
  Home, 
  Sun, 
  Coffee,
  Circle,
  type LucideIcon
} from "lucide-react";

export interface CourtFeatureConfig {
  key: string;
  label: string;
  icon: LucideIcon;
  description: string;
}

/**
 * Alle verfügbaren Court-Features mit konsistenten Keys
 * Diese Keys werden in features_json der locations-Tabelle gespeichert
 */
export const COURT_FEATURES: CourtFeatureConfig[] = [
  { key: "wc", label: "WC", icon: Bath, description: "Toiletten vorhanden" },
  { key: "dusche", label: "Dusche", icon: Droplets, description: "Duschmöglichkeiten" },
  { key: "umkleide", label: "Umkleide", icon: Shirt, description: "Umkleidekabinen" },
  { key: "flutlicht", label: "Flutlicht", icon: Lightbulb, description: "Beleuchtung für Abendspiele" },
  { key: "parkplaetze", label: "Parkplätze", icon: Car, description: "Parkmöglichkeiten" },
  { key: "schlaegerverleih", label: "Schlägerverleih", icon: Circle, description: "Schläger zum Ausleihen" },
  { key: "ballverleih", label: "Ballverleih", icon: Circle, description: "Bälle zum Ausleihen" },
  { key: "wifi", label: "WLAN", icon: Wifi, description: "Kostenloses WLAN" },
  { key: "barrierefrei", label: "Barrierefrei", icon: Accessibility, description: "Rollstuhlgerecht" },
  { key: "indoor", label: "Indoor", icon: Home, description: "Überdachte Plätze" },
  { key: "outdoor", label: "Outdoor", icon: Sun, description: "Außenplätze" },
  { key: "gastro", label: "Gastronomie", icon: Coffee, description: "Restaurant oder Bar" },
];

export type CourtFeatureKey = typeof COURT_FEATURES[number]["key"];

/**
 * Default-Werte für alle Features (alle deaktiviert)
 */
export const DEFAULT_COURT_FEATURES: Record<CourtFeatureKey, boolean> = {
  wc: false,
  dusche: false,
  umkleide: false,
  flutlicht: false,
  parkplaetze: false,
  schlaegerverleih: false,
  ballverleih: false,
  wifi: false,
  barrierefrei: false,
  indoor: false,
  outdoor: false,
  gastro: false,
};

/**
 * Whitelist der Features die Club-Owner bearbeiten dürfen
 * (wird auch von der Edge Function verwendet)
 */
export const CLUB_OWNER_ALLOWED_FEATURES: CourtFeatureKey[] = [
  "wc",
  "dusche",
  "umkleide",
  "flutlicht",
  "parkplaetze",
  "schlaegerverleih",
  "ballverleih",
  "wifi",
  "barrierefrei",
  "indoor",
  "outdoor",
  "gastro",
];

/**
 * Extrahiert Feature-Werte aus einem features_json Objekt
 */
export function extractFeatures(featuresJson: Record<string, unknown> | null | undefined): Record<CourtFeatureKey, boolean> {
  const result = { ...DEFAULT_COURT_FEATURES };
  
  if (!featuresJson || typeof featuresJson !== 'object') {
    return result;
  }
  
  for (const feature of COURT_FEATURES) {
    const value = featuresJson[feature.key];
    if (typeof value === 'boolean') {
      result[feature.key as CourtFeatureKey] = value;
    }
  }
  
  return result;
}
