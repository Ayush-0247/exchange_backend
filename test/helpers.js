/**
 * Converts Indian Rupees to paise (1 Rupee = 100 paise).
 * @param {number} rupees Amount in rupees.
 * @returns {number} Amount in paise.
 */
export const inr = (rupees) => rupees * 100;

/**
 * Converts BTC string or number to satoshis (1 BTC = 1e8 satoshi).
 * @param {string|number} s BTC amount.
 * @returns {number} Satoshis.
 */
export const btc = (s) => {
  const [w, f = ''] = String(s).split('.');
  return Number(w) * 1e8 + Number(f.padEnd(8, '0').slice(0, 8));
};
