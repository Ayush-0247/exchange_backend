import { describe, it, expect, beforeEach } from 'vitest';
import { createEngine } from '../src/engine/engine.js';
import { Level } from '../src/engine/level.js';
import { Side } from '../src/engine/side.js';
import { Book } from '../src/engine/book.js';
import { inr, btc } from './helpers.js';

describe('Level (Doubly Linked List Queue)', () => {
  it('should initialize empty', () => {
    const lvl = new Level(inr(5000000));
    expect(lvl.price).toBe(inr(5000000));
    expect(lvl.totalQty).toBe(0);
    expect(lvl.count).toBe(0);
    expect(lvl.head).toBeNull();
    expect(lvl.tail).toBeNull();
    expect(lvl.isEmpty()).toBe(true);
  });

  it('should push orders to tail and update totalQty', () => {
    const lvl = new Level(inr(5000000));
    const o1 = { id: 1, remaining: btc('0.5') };
    const o2 = { id: 2, remaining: btc('0.3') };

    lvl.push(o1);
    expect(lvl.count).toBe(1);
    expect(lvl.totalQty).toBe(btc('0.5'));
    expect(lvl.head).toBe(o1);
    expect(lvl.tail).toBe(o1);

    lvl.push(o2);
    expect(lvl.count).toBe(2);
    expect(lvl.totalQty).toBe(btc('0.8'));
    expect(lvl.head).toBe(o1);
    expect(lvl.tail).toBe(o2);
    expect(o1.next).toBe(o2);
    expect(o2.prev).toBe(o1);
  });

  it('should unlink head correctly', () => {
    const lvl = new Level(inr(5000000));
    const o1 = { id: 1, remaining: btc('0.1') };
    const o2 = { id: 2, remaining: btc('0.2') };
    const o3 = { id: 3, remaining: btc('0.3') };

    lvl.push(o1);
    lvl.push(o2);
    lvl.push(o3);

    expect(lvl.unlink(o1)).toBe(true);
    expect(lvl.head).toBe(o2);
    expect(o2.prev).toBeNull();
    expect(lvl.count).toBe(2);
    expect(lvl.totalQty).toBe(btc('0.5'));
  });

  it('should unlink middle node correctly', () => {
    const lvl = new Level(inr(5000000));
    const o1 = { id: 1, remaining: btc('0.1') };
    const o2 = { id: 2, remaining: btc('0.2') };
    const o3 = { id: 3, remaining: btc('0.3') };

    lvl.push(o1);
    lvl.push(o2);
    lvl.push(o3);

    expect(lvl.unlink(o2)).toBe(true);
    expect(o1.next).toBe(o3);
    expect(o3.prev).toBe(o1);
    expect(lvl.count).toBe(2);
    expect(lvl.totalQty).toBe(btc('0.4'));
  });

  it('should unlink tail correctly', () => {
    const lvl = new Level(inr(5000000));
    const o1 = { id: 1, remaining: btc('0.1') };
    const o2 = { id: 2, remaining: btc('0.2') };
    const o3 = { id: 3, remaining: btc('0.3') };

    lvl.push(o1);
    lvl.push(o2);
    lvl.push(o3);

    expect(lvl.unlink(o3)).toBe(true);
    expect(lvl.tail).toBe(o2);
    expect(o2.next).toBeNull();
    expect(lvl.count).toBe(2);
    expect(lvl.totalQty).toBe(btc('0.3'));
  });

  it('should unlink only order leaving level empty', () => {
    const lvl = new Level(inr(5000000));
    const o1 = { id: 1, remaining: btc('0.5') };
    lvl.push(o1);

    expect(lvl.unlink(o1)).toBe(true);
    expect(lvl.head).toBeNull();
    expect(lvl.tail).toBeNull();
    expect(lvl.count).toBe(0);
    expect(lvl.totalQty).toBe(0);
    expect(lvl.isEmpty()).toBe(true);
  });

  it('should return false when unlinking an order from a different level', () => {
    const lvl1 = new Level(inr(5000000));
    const lvl2 = new Level(inr(5005000));
    const o1 = { id: 1, remaining: btc('0.5') };
    lvl1.push(o1);

    expect(lvl2.unlink(o1)).toBe(false);
  });
});

describe('Side (Sorted Levels with Best-at-End)', () => {
  it('bids: insert keeps ascending order, best bid (highest price) is last element', () => {
    const bids = new Side(true);
    const l1 = new Level(inr(5000000));
    const l2 = new Level(inr(4995000));
    const l3 = new Level(inr(4998000));

    bids.insert(l1);
    bids.insert(l2);
    bids.insert(l3);

    expect(bids.levels.map((l) => l.price)).toEqual([
      inr(4995000),
      inr(4998000),
      inr(5000000)
    ]);
    expect(bids.bestLevel().price).toBe(inr(5000000));
    expect(bids.best.price).toBe(inr(5000000));
  });

  it('asks: insert keeps descending order, best ask (lowest price) is last element', () => {
    const asks = new Side(false);
    const l1 = new Level(inr(5005000));
    const l2 = new Level(inr(5010000));
    const l3 = new Level(inr(5002000));

    asks.insert(l1);
    asks.insert(l2);
    asks.insert(l3);

    expect(asks.levels.map((l) => l.price)).toEqual([
      inr(5010000),
      inr(5005000),
      inr(5002000)
    ]);
    expect(asks.bestLevel().price).toBe(inr(5002000));
    expect(asks.best.price).toBe(inr(5002000));
  });

  it('removes level correctly and updates best', () => {
    const asks = new Side(false);
    const l1 = new Level(inr(5005000));
    const l2 = new Level(inr(5002000));
    const l3 = new Level(inr(5010000));
    asks.insert(l1);
    asks.insert(l2);
    asks.insert(l3);

    expect(asks.bestLevel().price).toBe(inr(5002000));
    // Test removing best level at end
    expect(asks.removeLevel(l2)).toBe(true);
    expect(asks.bestLevel().price).toBe(inr(5005000));

    // Test removing middle/non-end level using binary search
    expect(asks.removeLevel(l3)).toBe(true);

    // Test removing from empty or not found
    const dummy = new Level(inr(9999999));
    expect(asks.removeLevel(dummy)).toBe(false);
    const emptySide = new Side(false);
    expect(emptySide.removeLevel(dummy)).toBe(false);
    expect(emptySide.bestLevel()).toBeNull();
  });

  it('bids and asks binary search branches during removeLevel', () => {
    const bids = new Side(true);
    const b1 = new Level(inr(4990000));
    const b2 = new Level(inr(4995000));
    const b3 = new Level(inr(5000000));
    bids.insert(b1);
    bids.insert(b2);
    bids.insert(b3);

    // Remove b1 (lowest price, front of bids array)
    expect(bids.removeLevel(b1)).toBe(true);
    // Try to remove not found
    const notFound = new Level(inr(4980000));
    expect(bids.removeLevel(notFound)).toBe(false);

    // Asks test
    const asks = new Side(false);
    const a1 = new Level(inr(5010000));
    const a2 = new Level(inr(5005000));
    const a3 = new Level(inr(5000000));
    const a4 = new Level(inr(4995000));
    asks.insert(a1);
    asks.insert(a2);
    asks.insert(a3);
    asks.insert(a4);

    // Remove a3 (midPrice 5005000 > 5000000, testing low = mid + 1 branch)
    expect(asks.removeLevel(a3)).toBe(true);
    expect(asks.removeLevel(new Level(inr(5020000)))).toBe(false);
  });
});

describe('Book', () => {
  it('adds and removes orders, cleaning up empty levels', () => {
    const book = new Book();
    const o1 = { id: 'B1', side: 'BUY', price: inr(5000000), remaining: btc('0.5') };
    book.add(o1);

    expect(book.hasOrder('B1')).toBe(true);
    expect(book.bestBid()).toEqual({ price: inr(5000000), qty: btc('0.5') });
    expect(book.bestAsk()).toBeNull();

    // Removing non-existent order returns null
    expect(book.remove('NON_EXISTENT')).toBeNull();

    const removed = book.remove('B1');
    expect(removed).toBe(o1);
    expect(book.hasOrder('B1')).toBe(false);
    expect(book.bestBid()).toBeNull();
  });

  it('filters openOrders by BUY and SELL side', () => {
    const book = new Book();
    const b1 = { id: 'B1', side: 'BUY', price: inr(5000000), remaining: btc('0.5') };
    const s1 = { id: 'S1', side: 'SELL', price: inr(5010000), remaining: btc('0.5') };
    book.add(b1);
    book.add(s1);

    expect(book.openOrders('BUY').map((o) => o.id)).toEqual(['B1']);
    expect(book.openOrders('SELL').map((o) => o.id)).toEqual(['S1']);
  });
});

describe('Matching Engine - Specification Scenarios (P1-T01 to P1-T26)', () => {
  let engine;
  let ts;

  const createBookA = (eng) => {
    const bookACommands = [
      { type: 'PLACE', ts: 1000, order: { id: 'B1', userId: 'F', side: 'BUY', price: inr(5000000), qty: btc('0.4'), tif: 'GTC' } },
      { type: 'PLACE', ts: 1001, order: { id: 'B2', userId: 'G', side: 'BUY', price: inr(4998000), qty: btc('0.7'), tif: 'GTC' } },
      { type: 'PLACE', ts: 1002, order: { id: 'B3', userId: 'H', side: 'BUY', price: inr(4995000), qty: btc('1.0'), tif: 'GTC' } },
      { type: 'PLACE', ts: 1003, order: { id: 'S1', userId: 'B', side: 'SELL', price: inr(5002000), qty: btc('0.2'), tif: 'GTC' } },
      { type: 'PLACE', ts: 1004, order: { id: 'S2', userId: 'C', side: 'SELL', price: inr(5005000), qty: btc('0.3'), tif: 'GTC' } },
      { type: 'PLACE', ts: 1005, order: { id: 'S3', userId: 'D', side: 'SELL', price: inr(5005000), qty: btc('0.1'), tif: 'GTC' } },
      { type: 'PLACE', ts: 1006, order: { id: 'S4', userId: 'E', side: 'SELL', price: inr(5010000), qty: btc('0.5'), tif: 'GTC' } }
    ];
    for (const cmd of bookACommands) {
      eng.process(cmd);
    }
  };

  beforeEach(() => {
    engine = createEngine();
    ts = 1767225600000;
  });

  // P1-T01
  it('P1-T01: Empty book. Buy 0.5 at 50,00,000 -> OrderAccepted only, Bids [[50,00,000, 0.5]]', () => {
    const events = engine.process({
      type: 'PLACE',
      ts,
      order: { id: 1, userId: 10, side: 'BUY', price: inr(5000000), qty: btc('0.5'), tif: 'GTC' }
    });

    expect(events).toEqual([
      {
        seq: 1,
        type: 'OrderAccepted',
        orderId: 1,
        side: 'BUY',
        price: inr(5000000),
        qty: btc('0.5'),
        tif: 'GTC'
      }
    ]);
    expect(engine.depth(1).bids).toEqual([[inr(5000000), btc('0.5')]]);
  });

  // P1-T02
  it('P1-T02: Two buys at the same price, first then second -> openOrders() lists first before second', () => {
    engine.process({
      type: 'PLACE',
      ts: ts + 1,
      order: { id: 'first', userId: 1, side: 'BUY', price: inr(5000000), qty: btc('0.2'), tif: 'GTC' }
    });
    engine.process({
      type: 'PLACE',
      ts: ts + 2,
      order: { id: 'second', userId: 2, side: 'BUY', price: inr(5000000), qty: btc('0.3'), tif: 'GTC' }
    });

    const open = engine.openOrders();
    expect(open.map((o) => o.id)).toEqual(['first', 'second']);
  });

  // P1-T03
  it('P1-T03: Book A. Buy 0.1 at 50,02,000 -> 1 trade: 0.1 at 50,02,000, maker S1. S1 remaining 0.1', () => {
    createBookA(engine);
    const events = engine.process({
      type: 'PLACE',
      ts: ts + 10,
      order: { id: 'T3', userId: 'Taker', side: 'BUY', price: inr(5002000), qty: btc('0.1'), tif: 'GTC' }
    });

    expect(events).toHaveLength(2);
    expect(events[0].type).toBe('OrderAccepted');
    expect(events[1]).toMatchObject({
      type: 'TradeExecuted',
      price: inr(5002000),
      qty: btc('0.1'),
      takerOrderId: 'T3',
      makerOrderId: 'S1',
      takerSide: 'BUY',
      ts: ts + 10
    });

    const s1 = engine.book.getOrder('S1');
    expect(s1.remaining).toBe(btc('0.1'));
  });

  // P1-T04
  it('P1-T04: Book A. Buy 0.2 at 50,02,000 -> 1 trade 0.2. Level 50,02,000 removed. Best ask is now 50,05,000', () => {
    createBookA(engine);
    const events = engine.process({
      type: 'PLACE',
      ts: ts + 10,
      order: { id: 'T4', userId: 'Taker', side: 'BUY', price: inr(5002000), qty: btc('0.2'), tif: 'GTC' }
    });

    const trades = events.filter((e) => e.type === 'TradeExecuted');
    expect(trades).toHaveLength(1);
    expect(trades[0].qty).toBe(btc('0.2'));
    expect(trades[0].makerOrderId).toBe('S1');
    expect(engine.book.getOrder('S1')).toBeNull();
    expect(engine.bestAsk().price).toBe(inr(5005000));
  });

  // P1-T05
  it('P1-T05: Book A. Buy 0.7 at 50,05,000 -> 3 trades (S1, S2, S3), rests 0.1 bid at 50,05,000, spread 5,000 rupees', () => {
    createBookA(engine);
    const events = engine.process({
      type: 'PLACE',
      ts: ts + 10,
      order: { id: 'T5', userId: 'Taker', side: 'BUY', price: inr(5005000), qty: btc('0.7'), tif: 'GTC' }
    });

    const trades = events.filter((e) => e.type === 'TradeExecuted');
    expect(trades).toHaveLength(3);
    expect(trades[0]).toMatchObject({ makerOrderId: 'S1', price: inr(5002000), qty: btc('0.2') });
    expect(trades[1]).toMatchObject({ makerOrderId: 'S2', price: inr(5005000), qty: btc('0.3') });
    expect(trades[2]).toMatchObject({ makerOrderId: 'S3', price: inr(5005000), qty: btc('0.1') });

    const bestBid = engine.bestBid();
    const bestAsk = engine.bestAsk();
    expect(bestBid).toEqual({ price: inr(5005000), qty: btc('0.1') });
    expect(bestAsk).toEqual({ price: inr(5010000), qty: btc('0.5') });
    expect(bestAsk.price - bestBid.price).toBe(inr(5000)); // 5,000 rupees spread
  });

  // P1-T06
  it('P1-T06: Book A. Buy 0.2 at 50,10,000 -> Trade price is 50,02,000 (maker), not 50,10,000', () => {
    createBookA(engine);
    const events = engine.process({
      type: 'PLACE',
      ts: ts + 10,
      order: { id: 'T6', userId: 'Taker', side: 'BUY', price: inr(5010000), qty: btc('0.2'), tif: 'GTC' }
    });

    const trade = events.find((e) => e.type === 'TradeExecuted');
    expect(trade.price).toBe(inr(5002000));
  });

  // P1-T07
  it('P1-T07: Book A. Buy 0.1 at 49,99,000 -> No trade. Bids in order: 50,00,000, 49,99,000, 49,98,000, 49,95,000', () => {
    createBookA(engine);
    const events = engine.process({
      type: 'PLACE',
      ts: ts + 10,
      order: { id: 'T7', userId: 'Taker', side: 'BUY', price: inr(4999000), qty: btc('0.1'), tif: 'GTC' }
    });

    const trades = events.filter((e) => e.type === 'TradeExecuted');
    expect(trades).toHaveLength(0);
    const bidPrices = engine.depth(10).bids.map(([p]) => p);
    expect(bidPrices).toEqual([inr(5000000), inr(4999000), inr(4998000), inr(4995000)]);
  });

  // P1-T08
  it('P1-T08: Book A. Sell 0.5 at 49,98,000 -> 2 trades (0.4 at 50,00,000 F, 0.1 at 49,98,000 G), B2 remaining 0.6', () => {
    createBookA(engine);
    const events = engine.process({
      type: 'PLACE',
      ts: ts + 10,
      order: { id: 'T8', userId: 'Taker', side: 'SELL', price: inr(4998000), qty: btc('0.5'), tif: 'GTC' }
    });

    const trades = events.filter((e) => e.type === 'TradeExecuted');
    expect(trades).toHaveLength(2);
    expect(trades[0]).toMatchObject({ makerOrderId: 'B1', price: inr(5000000), qty: btc('0.4') });
    expect(trades[1]).toMatchObject({ makerOrderId: 'B2', price: inr(4998000), qty: btc('0.1') });

    const b2 = engine.book.getOrder('B2');
    expect(b2.remaining).toBe(btc('0.6'));
  });

  // P1-T09
  it('P1-T09: Book A. Sell 0.3 at 50,20,000 -> No trade. Rests as an ask. Best ask still 50,02,000', () => {
    createBookA(engine);
    const events = engine.process({
      type: 'PLACE',
      ts: ts + 10,
      order: { id: 'T9', userId: 'Taker', side: 'SELL', price: inr(5020000), qty: btc('0.3'), tif: 'GTC' }
    });

    const trades = events.filter((e) => e.type === 'TradeExecuted');
    expect(trades).toHaveLength(0);
    expect(engine.bestAsk().price).toBe(inr(5002000));
    expect(engine.book.hasOrder('T9')).toBe(true);
  });

  // P1-T10
  it('P1-T10: Book A. Cancel S4 -> OrderCancelled(USER, remaining 0.5). Level 50,10,000 gone', () => {
    createBookA(engine);
    const events = engine.process({
      type: 'CANCEL',
      ts: ts + 10,
      orderId: 'S4'
    });

    expect(events).toEqual([
      {
        seq: expect.any(Number),
        type: 'OrderCancelled',
        orderId: 'S4',
        reason: 'USER',
        remaining: btc('0.5')
      }
    ]);
    expect(engine.book.hasOrder('S4')).toBe(false);
    expect(engine.book.asks.get(inr(5010000))).toBeUndefined();
  });

  // P1-T11
  it('P1-T11: Cancel an id that never existed -> OrderRejected(NOT_OPEN)', () => {
    const events = engine.process({
      type: 'CANCEL',
      ts: ts + 10,
      orderId: 'UNKNOWN_999'
    });

    expect(events).toEqual([
      {
        seq: 1,
        type: 'OrderRejected',
        orderId: 'UNKNOWN_999',
        reason: 'NOT_OPEN'
      }
    ]);
  });

  // P1-T12
  it('P1-T12: Cancel an order that already fully filled -> OrderRejected(NOT_OPEN)', () => {
    createBookA(engine);
    // Fill S1 fully
    engine.process({
      type: 'PLACE',
      ts: ts + 10,
      order: { id: 'T12', userId: 'Taker', side: 'BUY', price: inr(5002000), qty: btc('0.2'), tif: 'GTC' }
    });

    const cancelEvents = engine.process({
      type: 'CANCEL',
      ts: ts + 11,
      orderId: 'S1'
    });

    expect(cancelEvents).toEqual([
      {
        seq: expect.any(Number),
        type: 'OrderRejected',
        orderId: 'S1',
        reason: 'NOT_OPEN'
      }
    ]);
  });

  // P1-T13
  it('P1-T13: Place an order with an id already in the book -> OrderRejected(DUPLICATE_ORDER_ID). Book unchanged', () => {
    createBookA(engine);
    const events = engine.process({
      type: 'PLACE',
      ts: ts + 10,
      order: { id: 'S1', userId: 'Intruder', side: 'BUY', price: inr(5000000), qty: btc('0.1'), tif: 'GTC' }
    });

    expect(events).toEqual([
      {
        seq: expect.any(Number),
        type: 'OrderRejected',
        orderId: 'S1',
        reason: 'DUPLICATE_ORDER_ID'
      }
    ]);
    expect(engine.book.getOrder('S1').userId).toBe('B');
  });

  // P1-T14
  it('P1-T14: Book A. User B, owner of S1, buys 0.5 at 50,05,000 -> OrderCancelled(SELF_TRADE, remaining 0.5). No trades. S1 intact', () => {
    createBookA(engine);
    const events = engine.process({
      type: 'PLACE',
      ts: ts + 10,
      order: { id: 'B_SELF', userId: 'B', side: 'BUY', price: inr(5005000), qty: btc('0.5'), tif: 'GTC' }
    });

    expect(events).toEqual([
      {
        seq: expect.any(Number),
        type: 'OrderAccepted',
        orderId: 'B_SELF',
        side: 'BUY',
        price: inr(5005000),
        qty: btc('0.5'),
        tif: 'GTC'
      },
      {
        seq: expect.any(Number),
        type: 'OrderCancelled',
        orderId: 'B_SELF',
        reason: 'SELF_TRADE',
        remaining: btc('0.5')
      }
    ]);

    const s1 = engine.book.getOrder('S1');
    expect(s1.remaining).toBe(btc('0.2'));
  });

  // P1-T15
  it('P1-T15: Book A. User D buys 0.5 at 50,05,000 -> Fills S1 and S2 (0.2 + 0.3) before reaching D own S3. Order done. No self trade event', () => {
    createBookA(engine);
    const events = engine.process({
      type: 'PLACE',
      ts: ts + 10,
      order: { id: 'D_BUY', userId: 'D', side: 'BUY', price: inr(5005000), qty: btc('0.5'), tif: 'GTC' }
    });

    const trades = events.filter((e) => e.type === 'TradeExecuted');
    expect(trades).toHaveLength(2);
    expect(trades[0].makerOrderId).toBe('S1');
    expect(trades[1].makerOrderId).toBe('S2');

    const selfTrades = events.filter((e) => e.reason === 'SELF_TRADE');
    expect(selfTrades).toHaveLength(0);

    const s3 = engine.book.getOrder('S3');
    expect(s3.remaining).toBe(btc('0.1'));
  });

  // P1-T16
  it('P1-T16: Book A. User D buys 0.6 at 50,05,000 -> 2 trades (S1, S2). S3 is D own: OrderCancelled(SELF_TRADE, remaining 0.1). S3 intact', () => {
    createBookA(engine);
    const events = engine.process({
      type: 'PLACE',
      ts: ts + 10,
      order: { id: 'D_BUY_6', userId: 'D', side: 'BUY', price: inr(5005000), qty: btc('0.6'), tif: 'GTC' }
    });

    const trades = events.filter((e) => e.type === 'TradeExecuted');
    expect(trades).toHaveLength(2);
    expect(trades[0].makerOrderId).toBe('S1');
    expect(trades[1].makerOrderId).toBe('S2');

    const cancelled = events.find((e) => e.type === 'OrderCancelled');
    expect(cancelled).toEqual({
      seq: expect.any(Number),
      type: 'OrderCancelled',
      orderId: 'D_BUY_6',
      reason: 'SELF_TRADE',
      remaining: btc('0.1')
    });

    const s3 = engine.book.getOrder('S3');
    expect(s3.remaining).toBe(btc('0.1'));
  });

  // P1-T17
  it('P1-T17: Counters -> First call gives seq 1, 2, 3, tradeNo 1, 2, and both continue across later calls', () => {
    const e1 = engine.process({
      type: 'PLACE',
      ts: 100,
      order: { id: 1, userId: 1, side: 'SELL', price: inr(5000000), qty: btc('0.5'), tif: 'GTC' }
    });
    expect(e1[0].seq).toBe(1);

    const e2 = engine.process({
      type: 'PLACE',
      ts: 101,
      order: { id: 2, userId: 2, side: 'BUY', price: inr(5000000), qty: btc('0.3'), tif: 'GTC' }
    });
    expect(e2[0].seq).toBe(2);
    expect(e2[1].seq).toBe(3);
    expect(e2[1].tradeNo).toBe(1);

    const e3 = engine.process({
      type: 'PLACE',
      ts: 102,
      order: { id: 3, userId: 3, side: 'BUY', price: inr(5000000), qty: btc('0.2'), tif: 'GTC' }
    });
    expect(e3[0].seq).toBe(4);
    expect(e3[1].seq).toBe(5);
    expect(e3[1].tradeNo).toBe(2);
  });

  // P1-T18
  it('P1-T18: Book A. depth(2) -> Asks [[50,02,000, 0.2], [50,05,000, 0.4]], bids [[50,00,000, 0.4], [49,98,000, 0.7]], S2+S3 aggregated', () => {
    createBookA(engine);
    const d = engine.depth(2);

    expect(d.asks).toEqual([
      [inr(5002000), btc('0.2')],
      [inr(5005000), btc('0.4')] // S2 (0.3) + S3 (0.1)
    ]);
    expect(d.bids).toEqual([
      [inr(5000000), btc('0.4')],
      [inr(4998000), btc('0.7')]
    ]);
  });

  // P1-T19
  it('P1-T19: Book A. Cancel S2, then buy 0.1 at 50,05,000 -> After S1 gone, trade is with S3', () => {
    createBookA(engine);
    // Cancel S2
    engine.process({ type: 'CANCEL', ts: ts + 1, orderId: 'S2' });
    // Fill S1
    engine.process({
      type: 'PLACE',
      ts: ts + 2,
      order: { id: 'FILL_S1', userId: 'T', side: 'BUY', price: inr(5002000), qty: btc('0.2'), tif: 'GTC' }
    });

    // Buy 0.1 at 50,05,000
    const events = engine.process({
      type: 'PLACE',
      ts: ts + 3,
      order: { id: 'BUY_S3', userId: 'T', side: 'BUY', price: inr(5005000), qty: btc('0.1'), tif: 'GTC' }
    });

    const trade = events.find((e) => e.type === 'TradeExecuted');
    expect(trade.makerOrderId).toBe('S3');
    expect(trade.price).toBe(inr(5005000));
  });

  // P1-T20
  it('P1-T20: openOrders() on Book A -> Time priority order within each side', () => {
    createBookA(engine);
    const open = engine.openOrders();
    const bidIds = open.filter((o) => o.side === 'BUY').map((o) => o.id);
    const askIds = open.filter((o) => o.side === 'SELL').map((o) => o.id);

    expect(bidIds).toEqual(['B1', 'B2', 'B3']);
    expect(askIds).toEqual(['S1', 'S2', 'S3', 'S4']);
  });

  // P1-T21
  it('P1-T21: Run the same command list twice on two engines -> Event lists deep-equal', () => {
    const commands = [
      { type: 'PLACE', ts: 100, order: { id: 1, userId: 'A', side: 'BUY', price: inr(5000000), qty: btc('1.0'), tif: 'GTC' } },
      { type: 'PLACE', ts: 101, order: { id: 2, userId: 'B', side: 'SELL', price: inr(4995000), qty: btc('0.4'), tif: 'GTC' } },
      { type: 'CANCEL', ts: 102, orderId: 1 },
      { type: 'PLACE', ts: 103, order: { id: 3, userId: 'C', side: 'SELL', price: inr(5010000), qty: btc('0.5'), tif: 'GTC' } }
    ];

    const engine1 = createEngine();
    const engine2 = createEngine();

    const events1 = commands.flatMap((c) => engine1.process(c));
    const events2 = commands.flatMap((c) => engine2.process(c));

    expect(events1).toEqual(events2);
  });

  // P1-T22
  it('P1-T22: After P1-T03: openOrders() shows S1 remaining 0.1', () => {
    createBookA(engine);
    engine.process({
      type: 'PLACE',
      ts: ts + 10,
      order: { id: 'T3', userId: 'Taker', side: 'BUY', price: inr(5002000), qty: btc('0.1'), tif: 'GTC' }
    });

    const open = engine.openOrders();
    const s1 = open.find((o) => o.id === 'S1');
    expect(s1).toBeDefined();
    expect(s1.remaining).toBe(btc('0.1'));
  });

  // P1-T23
  it('P1-T23: Book A. Buy 2.0 at 60,00,000 -> 4 trades sweep all asks (1.1 BTC), rests 0.9 bid at 60,00,000', () => {
    createBookA(engine);
    const events = engine.process({
      type: 'PLACE',
      ts: ts + 10,
      order: { id: 'SWEEP_BUY', userId: 'Whale', side: 'BUY', price: inr(6000000), qty: btc('2.0'), tif: 'GTC' }
    });

    const trades = events.filter((e) => e.type === 'TradeExecuted');
    expect(trades).toHaveLength(4);
    const totalTraded = trades.reduce((sum, t) => sum + t.qty, 0);
    expect(totalTraded).toBe(btc('1.1'));

    expect(engine.bestAsk()).toBeNull(); // All asks swept!
    const bestBid = engine.bestBid();
    expect(bestBid).toEqual({ price: inr(6000000), qty: btc('0.9') });
  });

  // P1-T24
  it('P1-T24: Book A. Sell 3.0 at 40,00,000 -> 3 trades sweep all bids (2.1 BTC), rests 0.9 ask at 40,00,000', () => {
    createBookA(engine);
    const events = engine.process({
      type: 'PLACE',
      ts: ts + 10,
      order: { id: 'SWEEP_SELL', userId: 'Whale', side: 'SELL', price: inr(4000000), qty: btc('3.0'), tif: 'GTC' }
    });

    const trades = events.filter((e) => e.type === 'TradeExecuted');
    expect(trades).toHaveLength(3);
    const totalTraded = trades.reduce((sum, t) => sum + t.qty, 0);
    expect(totalTraded).toBe(btc('2.1'));

    expect(engine.bestBid()).toBeNull(); // All bids swept!
    const bestAsk = engine.bestAsk();
    expect(bestAsk).toEqual({ price: inr(4000000), qty: btc('0.9') });
  });

  // P1-T25
  it('P1-T25: Place order with qty is 0, qty is 1.5, or negative -> Throws RangeError', () => {
    expect(() =>
      engine.process({
        type: 'PLACE',
        ts,
        order: { id: 1, userId: 1, side: 'BUY', price: inr(5000000), qty: 0 }
      })
    ).toThrow(RangeError);

    expect(() =>
      engine.process({
        type: 'PLACE',
        ts,
        order: { id: 2, userId: 1, side: 'BUY', price: inr(5000000), qty: 1.5 }
      })
    ).toThrow(RangeError);

    expect(() =>
      engine.process({
        type: 'PLACE',
        ts,
        order: { id: 3, userId: 1, side: 'BUY', price: inr(5000000), qty: -100 }
      })
    ).toThrow(RangeError);
  });

  // P1-T26
  it('P1-T26: Place order with price is 500000000.5 or 0 -> Throws RangeError', () => {
    expect(() =>
      engine.process({
        type: 'PLACE',
        ts,
        order: { id: 1, userId: 1, side: 'BUY', price: 500000000.5, qty: btc('1.0') }
      })
    ).toThrow(RangeError);

    expect(() =>
      engine.process({
        type: 'PLACE',
        ts,
        order: { id: 2, userId: 1, side: 'BUY', price: 0, qty: btc('1.0') }
      })
    ).toThrow(RangeError);

    expect(() =>
      engine.process({
        type: 'PLACE',
        ts,
        order: { id: 3, userId: 1, side: 'BUY', price: -500000000, qty: btc('1.0') }
      })
    ).toThrow(RangeError);
  });

  it('handles unknown command type returning empty array', () => {
    expect(engine.process({ type: 'UNKNOWN', ts })).toEqual([]);
  });

  it('defaults tif to GTC and postOnly to false when omitted on resting orders', () => {
    const e = createEngine();
    const events = e.process({
      type: 'PLACE',
      ts: 100,
      order: { id: 99, userId: 1, side: 'BUY', price: inr(5000000), qty: btc('1.0') }
    });
    expect(events[0].tif).toBe('GTC');
    const open = e.openOrders();
    expect(open[0].tif).toBe('GTC');
    expect(open[0].postOnly).toBe(false);
  });
});
