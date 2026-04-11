// Types specific to booking components
// Note: Use DbLocation from @/types for location data
// Note: Use SLOT_DURATIONS from @/types/constants for duration options

export interface Court {
  id: string;
  name: string;
  is_active: boolean;
}

export interface TimeSlot {
  time: string;
  available: boolean;
  courtId: string;
  courtName: string;
}
