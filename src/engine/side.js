/**
 * Represents one side of the order book (bids or asks).
 * Keeps price levels sorted such that the best price level is always the last element
 * for O(1) peek and O(1) pop when a price level is swept.
 */
export class Side {
  /**
   * Creates a new Side.
   * @param {boolean} isBid True for bids (BUY), false for asks (SELL).
   */
  constructor(isBid) {
    /** @type {boolean} True if bids, false if asks */
    this.isBid = isBid;
    /** @type {Array<import('./level.js').Level>} Price levels with best price at the end */
    this.levels = [];
    /** @type {Map<number, import('./level.js').Level>} O(1) map from price to Level */
    this.levelByPrice = new Map();
  }

  /**
   * Returns the best price level (last element in the array), or null if empty.
   * @returns {import('./level.js').Level|null}
   */
  bestLevel() {
    if (this.levels.length === 0) {
      return null;
    }
    return this.levels[this.levels.length - 1];
  }

  /**
   * Getter for best price level.
   * @returns {import('./level.js').Level|null}
   */
  get best() {
    return this.bestLevel();
  }

  /**
   * Retrieves a price level by price in O(1).
   * @param {number} price Price in paise per BTC.
   * @returns {import('./level.js').Level|undefined}
   */
  get(price) {
    return this.levelByPrice.get(price);
  }

  /**
   * Checks if this side has any price levels.
   * @returns {boolean} True if empty.
   */
  isEmpty() {
    return this.levels.length === 0;
  }

  /**
   * Inserts a price level into the sorted levels array, keeping best as the last element.
   * For bids: ascending price order (e.g. 4995, 4998, 5000 -> 5000 is best, at the end).
   * For asks: descending price order (e.g. 5010, 5005, 5002 -> 5002 is best, at the end).
   * @param {import('./level.js').Level} level Level to insert.
   */
  insert(level) {
    this.levelByPrice.set(level.price, level);

    const len = this.levels.length;
    if (len === 0) {
      this.levels.push(level);
      return;
    }

    // Binary search to find insert index
    let low = 0;
    let high = len;

    while (low < high) {
      const mid = (low + high) >> 1;
      const midPrice = this.levels[mid].price;

      // For bids: ascending order (lower prices first, higher prices last)
      // For asks: descending order (higher prices first, lower prices last)
      const comesBefore = this.isBid
        ? midPrice < level.price
        : midPrice > level.price;

      if (comesBefore) {
        low = mid + 1;
      } else {
        high = mid;
      }
    }

    this.levels.splice(low, 0, level);
  }

  /**
   * Removes a price level from this side.
   * If it is the best level at the end, pops in O(1).
   * @param {import('./level.js').Level} level Level to remove.
   * @returns {boolean} True if removed.
   */
  removeLevel(level) {
    this.levelByPrice.delete(level.price);

    const len = this.levels.length;
    if (len === 0) {
      return false;
    }

    // Fast path: if level is at the end (the best level)
    if (this.levels[len - 1] === level) {
      this.levels.pop();
      return true;
    }

    // Otherwise binary search to find index
    let low = 0;
    let high = len - 1;
    let foundIndex = -1;

    while (low <= high) {
      const mid = (low + high) >> 1;
      const midPrice = this.levels[mid].price;

      if (midPrice === level.price) {
        foundIndex = mid;
        break;
      }

      const comesBefore = this.isBid
        ? midPrice < level.price
        : midPrice > level.price;

      if (comesBefore) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    if (foundIndex !== -1) {
      this.levels.splice(foundIndex, 1);
      return true;
    }

    return false;
  }

  /**
   * Returns price levels in best-first order.
   * @returns {Array<import('./level.js').Level>} Array of levels from best to worst.
   */
  levelsBestFirst() {
    const result = [];
    for (let i = this.levels.length - 1; i >= 0; i -= 1) {
      result.push(this.levels[i]);
    }
    return result;
  }
}
