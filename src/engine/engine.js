import { Book } from './book.js';

/**
 * Validates that an amount or price is a strictly positive integer.
 * @param {number} value The number to check.
 * @returns {boolean} True if positive integer.
 */
function isPositiveInteger(value) {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

/**
 * Matching engine instance for an asset pair.
 * Maintains price-time priority, O(1) cancel, self-trade prevention, order types (GTC, IOC, FOK, Post-Only),
 * max fills cap, and sequential counters.
 */
export class Engine {
  /**
   * Initializes the engine with configuration and optional initial open orders for rebuild.
   * @param {object} [cfg] Configuration object.
   * @param {string} [cfg.marketId='BTCINR'] Market identifier.
   * @param {number} [cfg.tickSize=10000] Tick size in paise per BTC.
   * @param {number} [cfg.lotSize=10000] Lot size in satoshi.
   * @param {number} [cfg.maxFills=50] Maximum number of fills allowed per order command.
   * @param {object} [opts] Optional rebuild options.
   * @param {Array<object>} [opts.openOrders] Initial list of open orders to restore without matching.
   * @param {number} [opts.startSeq] Initial sequence counter.
   * @param {number} [opts.startTradeNo] Initial trade counter.
   */
  constructor(cfg = {}, opts = null) {
    /** @type {string} Market identifier */
    this.marketId = cfg.marketId || 'BTCINR';
    /** @type {number} Minimum price increment in paise */
    this.tickSize = cfg.tickSize || 10000;
    /** @type {number} Minimum quantity increment in satoshi */
    this.lotSize = cfg.lotSize || 10000;
    /** @type {number} Maximum fills per order */
    this.maxFills = cfg.maxFills ?? 50;

    /** @type {Book} The internal limit order book */
    this.book = new Book();

    if (opts) {
      this.eventSeq = opts.startSeq !== undefined ? opts.startSeq : (opts.openOrders ? 0 : 1);
      this.tradeNo = opts.startTradeNo !== undefined ? opts.startTradeNo : (opts.openOrders ? 0 : 1);

      if (Array.isArray(opts.openOrders)) {
        for (let i = 0; i < opts.openOrders.length; i += 1) {
          const o = opts.openOrders[i];
          const restoredOrder = {
            id: o.id,
            userId: o.userId,
            side: o.side,
            price: o.price,
            qty: o.qty || o.remaining,
            remaining: o.remaining,
            tif: o.tif || 'GTC',
            postOnly: o.postOnly || false
          };
          this.book.add(restoredOrder);
        }
      }
    } else {
      /** @type {number} Monotonically increasing sequence number */
      this.eventSeq = 1;
      /** @type {number} Monotonically increasing trade counter */
      this.tradeNo = 1;
    }
  }

  /**
   * Processes an incoming command (PLACE or CANCEL) and returns an array of emitted events.
   * @param {object} command The command to process.
   * @param {string} command.type Either 'PLACE' or 'CANCEL'.
   * @param {number} command.ts Timestamp in milliseconds from caller.
   * @param {object} [command.order] Order object if type is 'PLACE'.
   * @param {number|string} [command.orderId] Order id if type is 'CANCEL'.
   * @returns {Array<object>} List of emitted events.
   */
  process(command) {
    if (command.type === 'PLACE') {
      return this._handlePlace(command);
    }
    if (command.type === 'CANCEL') {
      return this._handleCancel(command);
    }
    return [];
  }

  /**
   * Handles CANCEL command.
   * @private
   * @param {object} command CANCEL command.
   * @returns {Array<object>}
   */
  _handleCancel(command) {
    const existing = this.book.getOrder(command.orderId);
    if (!existing) {
      return [
        {
          seq: this.eventSeq++,
          type: 'OrderRejected',
          orderId: command.orderId,
          reason: 'NOT_OPEN'
        }
      ];
    }

    const removed = this.book.remove(command.orderId);
    return [
      {
        seq: this.eventSeq++,
        type: 'OrderCancelled',
        orderId: command.orderId,
        reason: 'USER',
        remaining: removed.remaining
      }
    ];
  }

  /**
   * Checks whether an FOK order can be fully filled without violating self-trade prevention or max fills.
   * @private
   * @param {object} orderInput The FOK order.
   * @param {import('./side.js').Side} oppositeSide The opposite book side.
   * @returns {boolean}
   */
  _checkFokFillable(orderInput, oppositeSide) {
    const isBuy = orderInput.side === 'BUY';
    let fillableQty = 0;
    let fillsCount = 0;
    const maxFills = this.maxFills;

    const levels = oppositeSide.levelsBestFirst();
    for (let i = 0; i < levels.length; i += 1) {
      const level = levels[i];
      const crosses = isBuy ? level.price <= orderInput.price : level.price >= orderInput.price;
      if (!crosses) {
        break;
      }

      let maker = level.head;
      let selfTradeHit = false;

      while (maker !== null) {
        // Self-trade stops the walk
        if (maker.userId === orderInput.userId) {
          selfTradeHit = true;
          break;
        }

        fillsCount += 1;
        if (fillsCount > maxFills) {
          return false;
        }

        const canTake = orderInput.qty - fillableQty;
        const take = maker.remaining < canTake ? maker.remaining : canTake;
        fillableQty += take;

        if (fillableQty >= orderInput.qty) {
          return true;
        }

        maker = maker.next;
      }

      if (selfTradeHit) {
        return false;
      }
    }

    return fillableQty >= orderInput.qty;
  }

  /**
   * Handles PLACE command.
   * @private
   * @param {object} command PLACE command.
   * @returns {Array<object>}
   */
  _handlePlace(command) {
    const orderInput = command.order;

    // Guard rails: programmer error validation
    if (!isPositiveInteger(orderInput.qty)) {
      throw new RangeError(`qty must be a positive integer, got ${orderInput.qty}`);
    }
    if (!isPositiveInteger(orderInput.price)) {
      throw new RangeError(`price must be a positive integer, got ${orderInput.price}`);
    }

    // Duplicate order check
    if (this.book.hasOrder(orderInput.id)) {
      return [
        {
          seq: this.eventSeq++,
          type: 'OrderRejected',
          orderId: orderInput.id,
          reason: 'DUPLICATE_ORDER_ID'
        }
      ];
    }

    const isBuy = orderInput.side === 'BUY';
    const oppositeSide = isBuy ? this.book.asks : this.book.bids;
    const tif = orderInput.tif || 'GTC';
    const postOnly = Boolean(orderInput.postOnly);

    // Post-Only check: if it would match immediately, reject
    if (postOnly) {
      const bestLevel = oppositeSide.bestLevel();
      const wouldCross = bestLevel
        ? isBuy
          ? bestLevel.price <= orderInput.price
          : bestLevel.price >= orderInput.price
        : false;

      if (wouldCross) {
        return [
          {
            seq: this.eventSeq++,
            type: 'OrderRejected',
            orderId: orderInput.id,
            reason: 'POST_ONLY_WOULD_CROSS'
          }
        ];
      }

      // If it would not cross, it rests immediately
      const events = [
        {
          seq: this.eventSeq++,
          type: 'OrderAccepted',
          orderId: orderInput.id,
          side: orderInput.side,
          price: orderInput.price,
          qty: orderInput.qty,
          tif
        }
      ];

      const restingOrder = {
        id: orderInput.id,
        userId: orderInput.userId,
        side: orderInput.side,
        price: orderInput.price,
        qty: orderInput.qty,
        remaining: orderInput.qty,
        tif: 'GTC',
        postOnly: true
      };
      this.book.add(restingOrder);
      return events;
    }

    // FOK (Fill Or Kill) pre-check: must fill completely or reject
    if (tif === 'FOK') {
      const isFillable = this._checkFokFillable(orderInput, oppositeSide);
      if (!isFillable) {
        return [
          {
            seq: this.eventSeq++,
            type: 'OrderRejected',
            orderId: orderInput.id,
            reason: 'FOK_NOT_FILLABLE'
          }
        ];
      }
    }

    const events = [];

    // OrderAccepted event
    events.push({
      seq: this.eventSeq++,
      type: 'OrderAccepted',
      orderId: orderInput.id,
      side: orderInput.side,
      price: orderInput.price,
      qty: orderInput.qty,
      tif
    });

    let remaining = orderInput.qty;
    let cancelReason = null;
    let tradesCount = 0;

    // Matching loop
    while (remaining > 0 && !oppositeSide.isEmpty()) {
      const bestLevel = oppositeSide.bestLevel();

      // Check crossing price
      const isCrossing = isBuy
        ? bestLevel.price <= orderInput.price
        : bestLevel.price >= orderInput.price;

      if (!isCrossing) {
        break;
      }

      const maker = bestLevel.head;

      // Self-trade prevention (cancel newest)
      if (maker.userId === orderInput.userId) {
        events.push({
          seq: this.eventSeq++,
          type: 'OrderCancelled',
          orderId: orderInput.id,
          reason: 'SELF_TRADE',
          remaining
        });
        cancelReason = 'SELF_TRADE';
        break;
      }

      // Execute trade at maker price
      tradesCount += 1;
      const tradeQty = remaining < maker.remaining ? remaining : maker.remaining;

      events.push({
        seq: this.eventSeq++,
        type: 'TradeExecuted',
        tradeNo: this.tradeNo++,
        price: maker.price,
        qty: tradeQty,
        takerOrderId: orderInput.id,
        makerOrderId: maker.id,
        takerSide: orderInput.side,
        ts: command.ts
      });

      remaining -= tradeQty;
      maker.remaining -= tradeQty;
      bestLevel.totalQty -= tradeQty;

      if (maker.remaining === 0) {
        this.book.remove(maker.id);
      }

      // Max fills cap reached
      if (tradesCount >= this.maxFills && remaining > 0) {
        events.push({
          seq: this.eventSeq++,
          type: 'OrderCancelled',
          orderId: orderInput.id,
          reason: 'MAX_FILLS',
          remaining
        });
        cancelReason = 'MAX_FILLS';
        break;
      }
    }

    // Remainder handling
    if (remaining > 0 && !cancelReason) {
      if (tif === 'IOC') {
        events.push({
          seq: this.eventSeq++,
          type: 'OrderCancelled',
          orderId: orderInput.id,
          reason: 'IOC_REMAINDER',
          remaining
        });
      } else {
        const restingOrder = {
          id: orderInput.id,
          userId: orderInput.userId,
          side: orderInput.side,
          price: orderInput.price,
          qty: orderInput.qty,
          remaining,
          tif: 'GTC',
          postOnly: false
        };
        this.book.add(restingOrder);
      }
    }

    return events;
  }

  /**
   * Returns aggregated order book depth up to n levels per side, best prices first.
   * @param {number} [n=20] Max price levels to return per side.
   * @returns {{ bids: Array<[number, number]>, asks: Array<[number, number]> }}
   */
  depth(n = 20) {
    return this.book.depth(n);
  }

  /**
   * Returns open orders in time priority order: price level order, then queue order.
   * @param {string} [side] Optional 'BUY' or 'SELL'.
   * @returns {Array<object>}
   */
  openOrders(side) {
    return this.book.openOrders(side);
  }

  /**
   * Returns best bid price and total quantity, or null if no bids.
   * @returns {{ price: number, qty: number }|null}
   */
  bestBid() {
    return this.book.bestBid();
  }

  /**
   * Returns best ask price and total quantity, or null if no asks.
   * @returns {{ price: number, qty: number }|null}
   */
  bestAsk() {
    return this.book.bestAsk();
  }
}

/**
 * Factory function to create a new matching engine instance.
 * @param {object} [cfg] Configuration object with marketId, tickSize, lotSize, maxFills.
 * @param {object} [opts] Optional rebuild options with openOrders, startSeq, startTradeNo.
 * @returns {Engine} A fresh pure JavaScript matching engine instance.
 */
export function createEngine(cfg, opts) {
  return new Engine(cfg, opts);
}
