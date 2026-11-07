/**
 * Represents a single price level in the order book.
 * Maintains a FIFO doubly-linked list of orders at this exact price.
 */
export class Level {
  /**
   * Creates a new Level.
   * @param {number} price Price in paise per BTC (positive integer).
   */
  constructor(price) {
    /** @type {number} Price in paise per BTC */
    this.price = price;
    /** @type {number} Total resting quantity at this price level in satoshi */
    this.totalQty = 0;
    /** @type {number} Number of active orders at this price level */
    this.count = 0;
    /** @type {object|null} Head order (oldest order, first in queue) */
    this.head = null;
    /** @type {object|null} Tail order (newest order, last in queue) */
    this.tail = null;
  }

  /**
   * Appends an order to the back of the queue (tail).
   * @param {object} order Order object to append.
   */
  push(order) {
    order.level = this;
    order.prev = this.tail;
    order.next = null;

    if (this.tail !== null) {
      this.tail.next = order;
    } else {
      this.head = order;
    }

    this.tail = order;
    this.totalQty += order.remaining;
    this.count += 1;
  }

  /**
   * Unlinks an order from this doubly linked list in O(1).
   * @param {object} order Order object to unlink.
   * @returns {boolean} True if order was unlinked, false if not found on this level.
   */
  unlink(order) {
    if (order.level !== this) {
      return false;
    }

    if (order.prev !== null) {
      order.prev.next = order.next;
    } else {
      this.head = order.next;
    }

    if (order.next !== null) {
      order.next.prev = order.prev;
    } else {
      this.tail = order.prev;
    }

    this.totalQty -= order.remaining;
    this.count -= 1;

    order.prev = null;
    order.next = null;
    order.level = null;

    return true;
  }

  /**
   * Checks whether this price level has zero orders remaining.
   * @returns {boolean} True if empty.
   */
  isEmpty() {
    return this.count === 0;
  }
}
