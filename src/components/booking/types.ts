// Types specific to booking components
// Note: Use DbLocation from @/types for location data
// Note: Use SLOT_DURATIONS from @/types/constants for duration options

/** Sportart eines Platzes. Bestands-Courts sind per DB-Default 'padel'. */
export type CourtSport = "padel" | "tennis";

export const DEFAULT_COURT_SPORT: CourtSport = "padel";

/** Tennis wird ausschliesslich in 60-Minuten-Bloecken gebucht (auch serverseitig erzwungen). */
export const TENNIS_DURATION_MINUTES = 60;

/** Robuster Zugriff auf die Sportart — Altbestand ohne `sport` gilt als Padel. */
export function courtSport(court: Pick<Court, "sport">): CourtSport {
  return court.sport === "tennis" ? "tennis" : DEFAULT_COURT_SPORT;
}

export interface Court {
  id: string;
  name: string;
  is_active: boolean;
  /** Optionales, admin-pflegbares Kurz-Label (z. B. "Outdoor · Flutlicht"). */
  label?: string | null;
  /** Sportart des Platzes; fehlt sie (Altbestand), gilt Padel. */
  sport?: CourtSport;
}

export interface TimeSlot {
  time: string;
  available: boolean;
  courtId: string;
  courtName: string;
}
