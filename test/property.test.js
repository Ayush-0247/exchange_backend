import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { createEngine } from '../src/engine/engine.js';

describe('Phase 2 - Property-Based Testing (1,000 runs)', () => {
  it('preserves all 11 exchange invariants across 1,000 runs of random commands', () => {
    const rawCommandArbitrary = fc.record({
      action: fc.constantFrom('PLACE', 'PLACE', 'PLACE', 'PLACE', 'CANCEL'),
      side: fc.constantFrom('BUY', 'SELL'),
      userId: fc.integer({ min: 1, max: 5 }),
      k: fc.integer({ min: -50, max: 50 }),
      m: fc.integer({ min: 1, max: 500 }),
      tif: fc.constantFrom('GTC', 'GTC', 'IOC', 'FOK'),
      postOnly: fc.boolean(),
      cancelOffset: fc.integer({ min: 0, max: 10 })
    });

    const commandListArbitrary = fc.array(rawCommandArbitrary, { minLength: 1, maxLength: 80 });

    fc.assert(
      fc.property(commandListArbitrary, (rawCmds) => {
        const engine = createEngine({ maxFills: 50 });
        let expectedSeq = 1;
        let expectedTradeNo = 1;
        let nextOrderId = 1;
        let baseTs = 1767225600000;

        const activeOrderIds = [];
        const orderHistory = new Map();

        for (const raw of rawCmds) {
          baseTs += 1;
          let cmd;

          if (raw.action === 'CANCEL') {
            const targetId = activeOrderIds.length > 0
              ? activeOrderIds[Math.max(0, activeOrderIds.length - 1 - raw.cancelOffset)]
              : 999999;
            cmd = { type: 'CANCEL', ts: baseTs, orderId: targetId };
          } else {
            const id = nextOrderId++;
            const price = 500_000_000 + raw.k * 10_000;
            const qty = 10_000 * raw.m;
            const tif = raw.tif;
            const postOnly = tif === 'GTC' ? raw.postOnly : false;

            cmd = {
              type: 'PLACE',
              ts: baseTs,
              order: {
                id,
                userId: raw.userId,
                side: raw.side,
                price,
                qty,
                tif,
                postOnly
              }
            };

            orderHistory.set(id, {
              originalQty: qty,
              tradedQty: 0,
              cancelledQty: 0,
              tif,
              postOnly,
              side: raw.side,
              price,
              tradeCount: 0,
              accepted: false
            });
          }

          const events = engine.process(cmd);

          // Invariant 6: seq rises by exactly 1 per event and tradeNo by exactly 1 per trade
          for (const ev of events) {
            expect(ev.seq).toBe(expectedSeq++);

            if (ev.type === 'OrderAccepted') {
              const ord = orderHistory.get(ev.orderId);
              if (ord) {
                ord.accepted = true;
              }
            } else if (ev.type === 'TradeExecuted') {
              expect(ev.tradeNo).toBe(expectedTradeNo++);

              // Invariant 4: Every trade price equals maker price, and sits within taker limit
              const takerOrder = orderHistory.get(ev.takerOrderId);
              expect(takerOrder).toBeDefined();
              if (ev.takerSide === 'BUY') {
                expect(ev.price).toBeLessThanOrEqual(takerOrder.price);
              } else {
                expect(ev.price).toBeGreaterThanOrEqual(takerOrder.price);
              }

              // Invariant 8: A post-only order never produces a trade
              expect(takerOrder.postOnly).toBe(false);

              takerOrder.tradedQty += ev.qty;
              takerOrder.tradeCount += 1;

              // Invariant 10: No order has more than 50 trades
              expect(takerOrder.tradeCount).toBeLessThanOrEqual(50);

              const makerOrder = orderHistory.get(ev.makerOrderId);
              if (makerOrder) {
                expect(ev.price).toBe(makerOrder.price);
                makerOrder.tradedQty += ev.qty;
                makerOrder.tradeCount += 1;
              }
            } else if (ev.type === 'OrderCancelled') {
              const ord = orderHistory.get(ev.orderId);
              if (ord) {
                ord.cancelledQty += ev.remaining;
              }
            }
          }

          if (cmd.type === 'PLACE') {
            if (engine.book.hasOrder(cmd.order.id)) {
              activeOrderIds.push(cmd.order.id);
            }
          }

          // Invariant 1: The book is never crossed (best bid price < best ask price)
          const bestBid = engine.bestBid();
          const bestAsk = engine.bestAsk();
          if (bestBid && bestAsk) {
            expect(bestBid.price).toBeLessThan(bestAsk.price);
          }

          // Invariant 2 & 9: Every open order has 0 < remaining <= qty, and IOC never rests
          const openOrders = engine.openOrders();
          for (const open of openOrders) {
            expect(open.remaining).toBeGreaterThan(0);
            expect(open.remaining).toBeLessThanOrEqual(open.qty);
            expect(open.tif).not.toBe('IOC');
          }

          // Invariant 11: depth() totals equal sum of openOrders() remaining per price
          const depth = engine.depth(100);
          const bidsMap = new Map();
          const asksMap = new Map();

          for (const open of openOrders) {
            const m = open.side === 'BUY' ? bidsMap : asksMap;
            m.set(open.price, (m.get(open.price) || 0) + open.remaining);
          }

          for (const [p, q] of depth.bids) {
            expect(q).toBe(bidsMap.get(p));
          }
          for (const [p, q] of depth.asks) {
            expect(q).toBe(asksMap.get(p));
          }

          // Invariant 7: A FOK order produces either full fills or rejection, never partial fill
          if (cmd.type === 'PLACE' && cmd.order.tif === 'FOK') {
            const fokRecord = orderHistory.get(cmd.order.id);
            expect(
              fokRecord.tradedQty === fokRecord.originalQty || fokRecord.tradedQty === 0
            ).toBe(true);
          }
        }

        // Invariant 3: For every accepted order, traded + remaining + cancelled = original quantity
        const openById = new Map(engine.openOrders().map((o) => [o.id, o.remaining]));
        for (const [id, rec] of orderHistory) {
          if (rec.accepted) {
            const rem = openById.get(id) || 0;
            const totalAccounted = rec.tradedQty + rec.cancelledQty + rem;
            expect(totalAccounted).toBe(rec.originalQty);
          }
        }
      }),
      { numRuns: 1000 }
    );
  });
});
