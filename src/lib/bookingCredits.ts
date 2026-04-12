export const POINTS_PER_HOUR = 100;

// Onboarding one-time bonuses
export const ONBOARDING_POINTS = {
  profile: 250,   // display_name + avatar set
  booking: 500,   // first booking confirmed
  friend: 150,    // first friend accepted
} as const;

// Week streak → multiplier table
export function getStreakMultiplier(weekStreak: number): number {
  if (weekStreak >= 4) return 2.5;
  if (weekStreak === 3) return 2.0;
  if (weekStreak === 2) return 1.5;
  return 1.0;
}

export function getStreakLabel(weekStreak: number): string {
  return `${getStreakMultiplier(weekStreak)}x`;
}

export function getStreakColor(weekStreak: number): string {
  if (weekStreak >= 4) return "text-orange-400";
  if (weekStreak >= 3) return "text-amber-400";
  if (weekStreak >= 2) return "text-yellow-400";
  return "text-primary";
}

// Points earned for a booking slot, rounded to nearest 0.5h
export function calculateBookingPoints(
  startTime: string | Date,
  endTime: string | Date,
  weekStreak: number
): number {
  const start = typeof startTime === "string" ? new Date(startTime) : startTime;
  const end = typeof endTime === "string" ? new Date(endTime) : endTime;
  const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  const roundedHours = Math.max(0.5, Math.round(hours * 2) / 2);
  return Math.round(roundedHours * POINTS_PER_HOUR * getStreakMultiplier(weekStreak));
}
