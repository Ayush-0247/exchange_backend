/**
 * Computes trade fee in paise from notional value and basis points (bps).
 * Uses ceiling rounding so any non-zero trade pays at least 1 paisa (never 0 fee).
 * @param {number|bigint} notionalPaise Notional value in paise.
 * @param {number|bigint} bps Fee rate in basis points (1 bps = 0.01% = 1/10000).
 * @returns {bigint} Fee in paise rounded up to the nearest paisa.
 */
export const fee = (notionalPaise, bps) => {
  const notionalBig = BigInt(notionalPaise);
  if (notionalBig === 0n) {
    return 0n;
  }
  return (notionalBig * BigInt(bps) + 9_999n) / 10_000n;
};
