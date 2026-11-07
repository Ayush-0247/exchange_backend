import { notional } from '../money/units.js';

/**
 * Validates an incoming order against exchange rules and market configuration.
 * Checked in strict priority order.
 * @param {object} order The order object to validate.
 * @param {string} [order.tif='GTC'] Time-in-force: 'GTC', 'IOC', or 'FOK'.
 * @param {boolean} [order.postOnly=false] Post-only flag.
 * @param {number} order.price Price in paise per BTC.
 * @param {number} order.qty Quantity in satoshis.
 * @param {object} [marketCfg] Market configuration.
 * @param {number} [marketCfg.tickSize=10000] Minimum price tick in paise.
 * @param {number} [marketCfg.lotSize=10000] Minimum quantity lot in satoshis.
 * @param {number|bigint} [marketCfg.minNotional=50000] Minimum notional value in paise.
 * @param {number|bigint} [marketCfg.maxNotional=1000000000] Maximum notional value in paise.
 * @returns {{ ok: true }|{ ok: false, code: string }} Validation result.
 */
export function validateOrder(order, marketCfg = {}) {
  const tickSize = marketCfg.tickSize ?? 10000;
  const lotSize = marketCfg.lotSize ?? 10000;
  const minNotional = BigInt(marketCfg.minNotional ?? 50000);
  const maxNotional = BigInt(marketCfg.maxNotional ?? 1000000000);

  // 1. TIF is GTC, IOC, or FOK
  const tif = order.tif || 'GTC';
  if (tif !== 'GTC' && tif !== 'IOC' && tif !== 'FOK') {
    return { ok: false, code: 'INVALID_TIF' };
  }

  // 2. postOnly cannot be combined with IOC or FOK
  if (order.postOnly && (tif === 'IOC' || tif === 'FOK')) {
    return { ok: false, code: 'INVALID_COMBINATION' };
  }

  // 3. Price is positive integer and multiple of tickSize
  if (
    typeof order.price !== 'number' ||
    !Number.isInteger(order.price) ||
    order.price <= 0 ||
    order.price % tickSize !== 0
  ) {
    return { ok: false, code: 'INVALID_TICK' };
  }

  // 4. Qty is positive integer and multiple of lotSize
  if (
    typeof order.qty !== 'number' ||
    !Number.isInteger(order.qty) ||
    order.qty <= 0 ||
    order.qty % lotSize !== 0
  ) {
    return { ok: false, code: 'INVALID_LOT' };
  }

  // Calculate notional value in paise
  const notionalVal = notional(order.price, order.qty);

  // 5. Notional at least minNotional (50,000 paise)
  if (notionalVal < minNotional) {
    return { ok: false, code: 'BELOW_MIN_NOTIONAL' };
  }

  // 6. Notional at most maxNotional (1,000,000,000 paise)
  if (notionalVal > maxNotional) {
    return { ok: false, code: 'ABOVE_MAX_NOTIONAL' };
  }

  return { ok: true };
}
