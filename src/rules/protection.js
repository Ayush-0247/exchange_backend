/**
 * Computes a capped limit price for a market order based on slippage tolerance.
 * Protects market orders from sweeping illiquid books at extreme prices.
 * @param {object} params Parameter object.
 * @param {string} params.side 'BUY' or 'SELL'.
 * @param {number|null} params.bestOppositePrice Best opposite price in paise per BTC, or null.
 * @param {number} params.slippageBps Maximum allowed slippage in basis points (1 to 500).
 * @param {number} [params.tickSize=10000] Minimum price increment in paise.
 * @returns {number|{ error: string }} The calculated protection price in paise, or error object.
 */
export function protectionPrice({ side, bestOppositePrice, slippageBps, tickSize = 10000 }) {
  if (bestOppositePrice === null || bestOppositePrice === undefined || bestOppositePrice <= 0) {
    return { error: 'NO_LIQUIDITY' };
  }

  if (typeof slippageBps !== 'number' || !Number.isInteger(slippageBps) || slippageBps < 1 || slippageBps > 500) {
    return { error: 'INVALID_SLIPPAGE' };
  }

  const best = BigInt(bestOppositePrice);
  const bps = BigInt(slippageBps);
  const tick = BigInt(tickSize);

  if (side === 'BUY') {
    // Ceil of best * (10000 + bps) / 10000
    const rawNumerator = best * (10_000n + bps);
    const rawPrice = (rawNumerator + 9_999n) / 10_000n;
    // Ceil to tick
    const remainder = rawPrice % tick;
    const rounded = remainder === 0n ? rawPrice : rawPrice + (tick - remainder);
    return Number(rounded);
  }

  if (side === 'SELL') {
    // Floor of best * (10000 - bps) / 10000
    const rawNumerator = best * (10_000n - bps);
    const rawPrice = rawNumerator / 10_000n;
    // Floor to tick
    const rounded = (rawPrice / tick) * tick;
    return Number(rounded);
  }

  return { error: 'INVALID_SIDE' };
}
