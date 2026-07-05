// Shared formatting + points math for the marketplace shop.

export const eur = (cents: number): string =>
  "€" + ((cents || 0) / 100).toFixed(2).replace(".", ",");

export const ptsFmt = (n: number): string => (n || 0).toLocaleString("de-DE");

export const discountPct = (priceCents: number, uvpCents?: number | null): number =>
  uvpCents && uvpCents > priceCents ? Math.round((1 - priceCents / uvpCents) * 100) : 0;

/**
 * Highest number of points that may be applied to a subtotal, mirroring the
 * server-side cap in the marketplace-checkout edge function:
 *   capped at `maxPercent` of the subtotal AND the user's balance, rounded to 10.
 */
export function maxRedeemablePoints(
  subtotalCents: number,
  balance: number,
  centsPerPoint: number,
  maxPercent: number,
): number {
  if (!balance || balance <= 0 || centsPerPoint <= 0) return 0;
  const capCents = Math.floor((subtotalCents * maxPercent) / 100);
  const maxByCap = Math.floor(capCents / centsPerPoint);
  return Math.max(0, Math.floor(Math.min(balance, maxByCap) / 10) * 10);
}
