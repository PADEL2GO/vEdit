// Court pricing configuration (amounts in cents)
// Static fallback prices
export const COURT_PRICES: Record<number, number> = {
  60: 2400,  // 24.00 EUR for 60 minutes
  90: 3600,  // 36.00 EUR for 90 minutes
  120: 4000, // 40.00 EUR for 120 minutes
};

export const CURRENCY = 'EUR';

// Max players for a padel court (used for split calculations)
export const MAX_PLAYERS = 4;

export function getPriceForDuration(durationMinutes: number): number {
  return COURT_PRICES[durationMinutes] || COURT_PRICES[60];
}

export function formatPrice(cents: number, currency: string = CURRENCY): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: currency,
  }).format(cents / 100);
}

/**
 * Calculate the share per player (always 1/4 of total for padel)
 */
export function getSharePerPlayer(totalPriceCents: number): number {
  return Math.ceil(totalPriceCents / MAX_PLAYERS);
}

/**
 * Calculate owner's share based on number of invited players
 * Owner pays for themselves + empty slots
 * - 0 invited: owner pays 4/4 (100%)
 * - 1 invited: owner pays 3/4 (75%)
 * - 2 invited: owner pays 2/4 (50%)
 * - 3 invited: owner pays 1/4 (25%)
 */
export function getOwnerShare(totalPriceCents: number, invitedCount: number): number {
  const emptySlots = MAX_PLAYERS - 1 - invitedCount; // -1 for owner
  const ownerSlots = 1 + emptySlots; // Owner's slot + empty slots
  return Math.ceil((totalPriceCents * ownerSlots) / MAX_PLAYERS);
}

/**
 * Apply a voucher discount to a price in cents.
 * Returns the final price (never negative). Zero means fully free.
 */
export function applyVoucherDiscount(
  priceCents: number,
  discountType: string,
  discountValue: number,
): number {
  if (discountType === "free") return 0;
  if (discountType === "percentage") {
    if (discountValue >= 100) return 0;
    return Math.max(0, Math.ceil(priceCents * (1 - discountValue / 100)));
  }
  if (discountType === "fixed") {
    return Math.max(0, priceCents - discountValue);
  }
  return priceCents;
}

/**
 * Get all duration options with prices
 */
export function getDurationOptions(): Array<{ minutes: number; priceCents: number }> {
  return Object.entries(COURT_PRICES).map(([minutes, priceCents]) => ({
    minutes: parseInt(minutes),
    priceCents,
  }));
}
