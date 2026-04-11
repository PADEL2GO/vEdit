// Application-wide constants

// AI analytics preview: disabled in production (set to empty string so no account matches)
export const DUMMY_ANALYTICS_EMAIL = "";

// ============================================
// Domain constants (consolidated from types/constants.ts)
// ============================================

/** Weekday configuration for opening hours */
export const WEEKDAYS = [
  { key: "monday", label: "Montag" },
  { key: "tuesday", label: "Dienstag" },
  { key: "wednesday", label: "Mittwoch" },
  { key: "thursday", label: "Donnerstag" },
  { key: "friday", label: "Freitag" },
  { key: "saturday", label: "Samstag" },
  { key: "sunday", label: "Sonntag" },
] as const;

/** @deprecated Use COURT_FEATURES from courtFeatures.ts instead */
export const DEFAULT_AMENITIES = [] as const;

/** Available booking slot durations in minutes */
export const SLOT_DURATIONS = [60, 90, 120] as const;

export type SlotDuration = (typeof SLOT_DURATIONS)[number];
export type Weekday = (typeof WEEKDAYS)[number]["key"];
