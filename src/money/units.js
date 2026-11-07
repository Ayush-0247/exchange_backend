/**
 * Number of satoshis in 1 full Bitcoin (1e8 satoshis).
 * @type {bigint}
 */
export const SAT_PER_BTC = 100_000_000n;

/**
 * Computes the notional value of an order or trade in paise.
 * Uses exact BigInt integer division.
 * @param {number|bigint} pricePaise Price in paise per BTC (e.g. 500_000_000 for 50 lakh INR).
 * @param {number|bigint} qtySat Quantity in satoshis (e.g. 10_000_000 for 0.1 BTC).
 * @returns {bigint} Notional value in paise.
 */
export const notional = (pricePaise, qtySat) =>
  (BigInt(pricePaise) * BigInt(qtySat)) / SAT_PER_BTC;
