/**
 * Court-Auswahl des Club-Portals.
 *
 * Ein Verein kann Padel- UND Tennis-Courts zugewiesen bekommen. Alle Seiten des
 * Portals arbeiten deshalb auf genau einem bewusst gewählten Court statt auf dem
 * erstbesten (`primaryAssignment`). Die Auswahl ist bewusst auf die dem Verein
 * ohnehin zugewiesenen Courts begrenzt: ein fremder oder veralteter Wert fällt
 * still auf den Standard zurück, es gibt keinen Weg, darüber hinauszukommen.
 */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useClubAuth, type ClubCourtAssignment } from "@/hooks/useClubAuth";
import { DEFAULT_COURT_SPORT, type CourtSport } from "@/components/booking/types";

/** Pro Tab merken — ein Seitenwechsel (auch per Reload) behält den Court. */
const STORAGE_KEY = "club-portal-selected-court";

const DEFAULT_MONTHLY_FREE_MINUTES = 2400;

/** Sportart einer Zuweisung. Altbestand ohne `sport` gilt als Padel, wie der DB-Default. */
export const assignmentSport = (assignment?: ClubCourtAssignment | null): CourtSport =>
  assignment?.court?.sport === "tennis" ? "tennis" : DEFAULT_COURT_SPORT;

/** Farbpunkt im Umschalter. Padel = Lime (primary), Tennis = Hellblau. */
export const SPORT_DOT_CLASSES: Record<CourtSport, string> = {
  padel: "bg-primary",
  tennis: "bg-[#7FD4FF]",
};

interface ClubCourtContextValue {
  /** Alle dem Verein zugewiesenen Courts — die Auswahl kann nie darüber hinausgehen. */
  assignments: ClubCourtAssignment[];
  assignment: ClubCourtAssignment | null;
  courtId: string | null;
  courtName: string | null;
  locationName: string | null;
  sport: CourtSport;
  monthlyFreeMinutes: number;
  /** Bei nur einem Court gibt es nichts umzuschalten — dann bleibt die UI unverändert. */
  canSwitch: boolean;
  selectCourt: (courtId: string) => void;
}

const ClubCourtContext = createContext<ClubCourtContextValue | null>(null);

export function ClubCourtProvider({ children }: { children: ReactNode }) {
  const { assignments } = useClubAuth();
  const [storedCourtId, setStoredCourtId] = useState<string | null>(() =>
    sessionStorage.getItem(STORAGE_KEY),
  );

  const assignment = useMemo(() => {
    const chosen = assignments.find((a) => a.court_id === storedCourtId);
    if (chosen) return chosen;
    // Standard: erster Padel-Court, sonst der erste überhaupt.
    return assignments.find((a) => assignmentSport(a) === "padel") ?? assignments[0] ?? null;
  }, [assignments, storedCourtId]);

  const selectCourt = useCallback(
    (courtId: string) => {
      if (!assignments.some((a) => a.court_id === courtId)) return;
      sessionStorage.setItem(STORAGE_KEY, courtId);
      setStoredCourtId(courtId);
    },
    [assignments],
  );

  const value = useMemo<ClubCourtContextValue>(
    () => ({
      assignments,
      assignment,
      courtId: assignment?.court_id ?? null,
      courtName: assignment?.court?.name ?? null,
      locationName: assignment?.court?.location?.name ?? null,
      sport: assignmentSport(assignment),
      monthlyFreeMinutes: assignment?.monthly_free_minutes ?? DEFAULT_MONTHLY_FREE_MINUTES,
      canSwitch: assignments.length > 1,
      selectCourt,
    }),
    [assignments, assignment, selectCourt],
  );

  return <ClubCourtContext.Provider value={value}>{children}</ClubCourtContext.Provider>;
}

export function useClubCourt() {
  const context = useContext(ClubCourtContext);
  if (!context) {
    throw new Error("useClubCourt muss innerhalb des ClubCourtProvider verwendet werden");
  }
  return context;
}
