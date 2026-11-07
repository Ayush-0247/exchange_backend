/**
 * Formats an amount in paise to an Indian Rupee currency string with proper lakh/crore commas.
 * Example: 500_000_000 paise -> "₹50,00,000.00"
 * @param {number|bigint} paise Amount in paise.
 * @returns {string} Formatted Indian Rupee string.
 */
export function formatInr(paise) {
  const p = BigInt(paise);
  const isNegative = p < 0n;
  const absP = isNegative ? -p : p;
  const rupees = absP / 100n;
  const remPaise = (absP % 100n).toString().padStart(2, '0');

  const rStr = rupees.toString();
  let grouped = '';

  if (rStr.length <= 3) {
    grouped = rStr;
  } else {
    const last3 = rStr.slice(-3);
    const rest = rStr.slice(0, -3);
    const parts = [];
    let i = rest.length;

    while (i > 0) {
      const start = i > 2 ? i - 2 : 0;
      parts.unshift(rest.slice(start, i));
      i = start;
    }

    grouped = parts.join(',') + ',' + last3;
  }

  return `${isNegative ? '-' : ''}₹${grouped}.${remPaise}`;
}

/**
 * Formats a quantity in satoshis to a fixed 8-decimal Bitcoin string.
 * Example: 10_000_000 sat -> "0.10000000"
 * @param {number|bigint} sat Quantity in satoshis.
 * @returns {string} Formatted BTC string.
 */
export function formatBtc(sat) {
  const s = BigInt(sat);
  const isNegative = s < 0n;
  const absS = isNegative ? -s : s;
  const whole = absS / 100_000_000n;
  const fraction = (absS % 100_000_000n).toString().padStart(8, '0');
  return `${isNegative ? '-' : ''}${whole}.${fraction}`;
}
