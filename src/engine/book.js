import { Level } from './level.js';
import { Side } from './side.js';

/**
 * Represents the order book containing bids and asks.
 * Maintains O(1) order lookup by id and sorted price levels.
 */
export class Book {
  /**
   * Creates a new order book.
   */
  constructor() {
    /** @type {Side} Buy side of the book */
    this.bids = new Side(true);
    /** @type {Side} Sell side of the book */
    this.asks = new Side(false);
    /** @type {Map<number|string, object>} O(1) order lookup by id */
    this.ordersById = new Map();
  }

  /**
   * Adds an order to the book and places it at the tail of its price level.
   * @param {object} order Order to add.
   */
  add(order) {
    const side = order.side === 'BUY' ? this.bids : this.asks;
    let level = side.get(order.price);

    if (!level) {
      level = new Level(order.price);
      side.insert(level);
    }

    level.push(order);
    this.ordersById.set(order.id, order);
  }

  /**
   * Removes an order from the book by its id.
   * Cleans up empty price levels.
   * @param {number|string} orderId Order id to remove.
   * @returns {object|null} Removed order or null if not found.
   */
  remove(orderId) {
    const order = this.ordersById.get(orderId);
    if (!order) {
      return null;
    }

    const level = order.level;
    const side = order.side === 'BUY' ? this.bids : this.asks;

    if (level) {
      level.unlink(order);
      if (level.isEmpty()) {
        side.removeLevel(level);
      }
    }

    this.ordersById.delete(orderId);
    return order;
  }

  /**
   * Gets an order by its ID.
   * @param {number|string} orderId Order id.
   * @returns {object|null}
   */
  getOrder(orderId) {
    return this.ordersById.get(orderId) || null;
  }

  /**
   * Checks if an order exists in the book.
   * @param {number|string} orderId Order id.
   * @returns {boolean}
   */
  hasOrder(orderId) {
    return this.ordersById.has(orderId);
  }

  /**
   * Returns the best bid price and total quantity, or null if no bids.
   * @returns {{ price: number, qty: number }|null}
   */
  bestBid() {
    const lvl = this.bids.bestLevel();
    if (!lvl) {
      return null;
    }
    return { price: lvl.price, qty: lvl.totalQty };
  }

  /**
   * Returns the best ask price and total quantity, or null if no asks.
   * @returns {{ price: number, qty: number }|null}
   */
  bestAsk() {
    const lvl = this.asks.bestLevel();
    if (!lvl) {
      return null;
    }
    return { price: lvl.price, qty: lvl.totalQty };
  }

  /**
   * Returns aggregated order book depth up to n levels per side, best prices first.
   * @param {number} [n=20] Max price levels to return per side.
   * @returns {{ bids: Array<[number, number]>, asks: Array<[number, number]> }}
   */
  depth(n = 20) {
    const bidsList = [];
    const bidsLevels = this.bids.levelsBestFirst();
    const bidsLimit = Math.min(n, bidsLevels.length);
    for (let i = 0; i < bidsLimit; i += 1) {
      const lvl = bidsLevels[i];
      bidsList.push([lvl.price, lvl.totalQty]);
    }

    const asksList = [];
    const asksLevels = this.asks.levelsBestFirst();
    const asksLimit = Math.min(n, asksLevels.length);
    for (let i = 0; i < asksLimit; i += 1) {
      const lvl = asksLevels[i];
      asksList.push([lvl.price, lvl.totalQty]);
    }

    return { bids: bidsList, asks: asksList };
  }

  /**
   * Returns open orders in time priority order: price level order (best first),
   * then queue order (head to tail).
   * @param {string} [filterSide] Optional 'BUY' or 'SELL'.
   * @returns {Array<object>}
   */
  openOrders(filterSide) {
    const collectFromSide = (side) => {
      const orders = [];
      const levels = side.levelsBestFirst();
      for (let i = 0; i < levels.length; i += 1) {
        let curr = levels[i].head;
        while (curr !== null) {
          orders.push(curr);
          curr = curr.next;
        }
      }
      return orders;
    };

    if (filterSide === 'BUY') {
      return collectFromSide(this.bids);
    }
    if (filterSide === 'SELL') {
      return collectFromSide(this.asks);
    }

    const bidsOrders = collectFromSide(this.bids);
    const asksOrders = collectFromSide(this.asks);
    return [...bidsOrders, ...asksOrders];
  }
}
