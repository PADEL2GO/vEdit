// Shared formatting + points math for the marketplace shop.

export const eur = (cents: number): string =>
  "€" + ((cents || 0) / 100).toFixed(2).replace(".", ",");

export const ptsFmt = (n: number): string => (n || 0).toLocaleString("de-DE");

export const discountPct = (priceCents: number, uvpCents?: number | null): number =>
  uvpCents && uvpCents > priceCents ? Math.round((1 - priceCents / uvpCents) * 100) : 0;

/**
 * Highest number of points that may be applied to a subtotal, mirroring the
 * server-side cap in the marketplace-checkout edge function: the per-product
 * fixed cap (Admin "Punkte-Rabatt (max.)" = marketplace_items.credit_cost,
 * per order), never more than the subtotal or the user's balance, rounded to 10.
 */
export function maxRedeemablePoints(
  subtotalCents: number,
  balance: number,
  centsPerPoint: number,
  productCapPoints: number,
): number {
  if (!balance || balance <= 0 || centsPerPoint <= 0) return 0;
  const capByPrice = Math.floor(subtotalCents / centsPerPoint);
  const cap = Math.min(balance, Math.max(0, productCapPoints || 0), capByPrice);
  return Math.max(0, Math.floor(cap / 10) * 10);
}
