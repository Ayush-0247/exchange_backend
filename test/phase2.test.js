import { describe, it, expect, beforeEach } from 'vitest';
import { createEngine } from '../src/engine/engine.js';
import { notional } from '../src/money/units.js';
import { fee } from '../src/money/fees.js';
import { formatInr, formatBtc } from '../src/money/format.js';
import { protectionPrice } from '../src/rules/protection.js';
import { validateOrder } from '../src/rules/order.js';
import { inr, btc } from './helpers.js';

describe('Phase 2 - Money Module (P2-T14 to P2-T25)', () => {
  it('P2-T14: notional(500_000_000, 10_000_000) -> 50_000_000n (5 lakh INR)', () => {
    expect(notional(500_000_000, 10_000_000)).toBe(50_000_000n);
  });

  it('P2-T15: notional(500_000_000, 100_000_000) -> 500_000_000n (1 BTC)', () => {
    expect(notional(500_000_000, 100_000_000)).toBe(500_000_000n);
  });

  it('P2-T16: notional(500_200_000, 20_000_000) -> 100_040_000n', () => {
    expect(notional(500_200_000, 20_000_000)).toBe(100_040_000n);
  });

  it('P2-T17: fee(50_000_000, 10) -> 50_000n', () => {
    expect(fee(50_000_000, 10)).toBe(50_000n);
  });

  it('P2-T18: fee(50_000_000, 5) -> 25_000n', () => {
    expect(fee(50_000_000, 5)).toBe(25_000n);
  });

  it('P2-T19: fee(12_345, 10) -> 13n (rounded up from 12.345)', () => {
    expect(fee(12_345, 10)).toBe(13n);
  });

  it('P2-T20: fee(12_345, 5) -> 7n (rounded up from 6.1725)', () => {
    expect(fee(12_345, 5)).toBe(7n);
  });

  it('P2-T21: fee(1, 10) -> 1n (never zero for real trade)', () => {
    expect(fee(1, 10)).toBe(1n);
  });

  it('P2-T22: fee(0, 10) -> 0n', () => {
    expect(fee(0, 10)).toBe(0n);
  });

  it('P2-T23: formatInr(500_000_000) -> "₹50,00,000.00"', () => {
    expect(formatInr(500_000_000)).toBe('₹50,00,000.00');
  });

  it('P2-T24: formatInr(949_950_000) -> "₹94,99,500.00"', () => {
    expect(formatInr(949_950_000)).toBe('₹94,99,500.00');
  });

  it('P2-T25: formatBtc(10_000_000) -> "0.10000000"', () => {
    expect(formatBtc(10_000_000)).toBe('0.10000000');
  });

  it('format edge cases: negative amounts and small amounts', () => {
    expect(formatInr(500)).toBe('₹5.00');
    expect(formatInr(-500)).toBe('-₹5.00');
    expect(formatInr(-500_000_000)).toBe('-₹50,00,000.00');
    expect(formatBtc(-10_000_000)).toBe('-0.10000000');
  });

  it('Rule check: notional is always exact when price and qty are multiples of 10,000 (1000 runs)', () => {
    for (let i = 1; i <= 1000; i += 1) {
      const price = i * 10000;
      const qty = (1001 - i) * 10000;
      const prod = BigInt(price) * BigInt(qty);
      expect(prod % 100_000_000n).toBe(0n);
      const n = notional(price, qty);
      expect(n * 100_000_000n).toBe(prod);
    }
  });
});

describe('Phase 2 - Market Order Protection Price (P2-T10 to P2-T13)', () => {
  it('P2-T10: BUY, best ask 500,200,000, 100 bps -> 505,210,000', () => {
    const res = protectionPrice({
      side: 'BUY',
      bestOppositePrice: 500_200_000,
      slippageBps: 100,
      tickSize: 10_000
    });
    expect(res).toBe(505_210_000);
  });

  it('P2-T11: SELL, best bid 500,000,000, 100 bps -> 495,000,000', () => {
    const res = protectionPrice({
      side: 'SELL',
      bestOppositePrice: 500_000_000,
      slippageBps: 100,
      tickSize: 10_000
    });
    expect(res).toBe(495_000_000);
  });

  it('P2-T12: BUY, best ask 500,200,000, 1 bps -> 500,260,000', () => {
    const res = protectionPrice({
      side: 'BUY',
      bestOppositePrice: 500_200_000,
      slippageBps: 1,
      tickSize: 10_000
    });
    expect(res).toBe(500_260_000);
  });

  it('BUY protection price when raw price is exact multiple of tickSize', () => {
    const res = protectionPrice({
      side: 'BUY',
      bestOppositePrice: 500_000_000,
      slippageBps: 100,
      tickSize: 10_000
    });
    expect(res).toBe(505_000_000);
  });

  it('P2-T13: No opposite side or slippage out of range (0, 501) -> NO_LIQUIDITY / INVALID_SLIPPAGE', () => {
    expect(
      protectionPrice({
        side: 'BUY',
        bestOppositePrice: null,
        slippageBps: 100
      })
    ).toEqual({ error: 'NO_LIQUIDITY' });

    expect(
      protectionPrice({
        side: 'BUY',
        bestOppositePrice: 0,
        slippageBps: 100
      })
    ).toEqual({ error: 'NO_LIQUIDITY' });

    expect(
      protectionPrice({
        side: 'BUY',
        bestOppositePrice: 500_000_000,
        slippageBps: 0
      })
    ).toEqual({ error: 'INVALID_SLIPPAGE' });

    expect(
      protectionPrice({
        side: 'BUY',
        bestOppositePrice: 500_000_000,
        slippageBps: 501
      })
    ).toEqual({ error: 'INVALID_SLIPPAGE' });

    expect(
      protectionPrice({
        side: 'INVALID_SIDE',
        bestOppositePrice: 500_000_000,
        slippageBps: 100
      })
    ).toEqual({ error: 'INVALID_SIDE' });
  });
});

describe('Phase 2 - Validators (P2-T26 to P2-T32)', () => {
  it('P2-T26: price 500,000,050, qty 10,000,000 -> INVALID_TICK', () => {
    const res = validateOrder({ price: 500_000_050, qty: 10_000_000, tif: 'GTC' });
    expect(res).toEqual({ ok: false, code: 'INVALID_TICK' });
    expect(validateOrder({ price: 'bad', qty: 10_000_000 })).toEqual({ ok: false, code: 'INVALID_TICK' });
    expect(validateOrder({ price: 0, qty: 10_000_000 })).toEqual({ ok: false, code: 'INVALID_TICK' });
  });

  it('P2-T27: price 500,000,000, qty 15,000 -> INVALID_LOT', () => {
    const res = validateOrder({ price: 500_000_000, qty: 15_000, tif: 'GTC' });
    expect(res).toEqual({ ok: false, code: 'INVALID_LOT' });
    expect(validateOrder({ price: 500_000_000, qty: 'bad' })).toEqual({ ok: false, code: 'INVALID_LOT' });
    expect(validateOrder({ price: 500_000_000, qty: -10 })).toEqual({ ok: false, code: 'INVALID_LOT' });
  });

  it('P2-T28: price 490,000,000, qty 10,000 -> notional 49,000 -> BELOW_MIN_NOTIONAL', () => {
    const res = validateOrder({ price: 490_000_000, qty: 10_000, tif: 'GTC' });
    expect(res).toEqual({ ok: false, code: 'BELOW_MIN_NOTIONAL' });
  });

  it('P2-T29: price 500,000,000, qty 10,000 -> notional 50,000 -> ok: true', () => {
    const res = validateOrder({ price: 500_000_000, qty: 10_000, tif: 'GTC' });
    expect(res).toEqual({ ok: true });
  });

  it('P2-T30: price 500,000,000, qty 200,010,000 -> notional 1,000,050,000 -> ABOVE_MAX_NOTIONAL', () => {
    const res = validateOrder({ price: 500_000_000, qty: 200_010_000, tif: 'GTC' });
    expect(res).toEqual({ ok: false, code: 'ABOVE_MAX_NOTIONAL' });
  });

  it('P2-T31: IOC or FOK with postOnly is true -> INVALID_COMBINATION', () => {
    expect(
      validateOrder({
        price: 500_000_000,
        qty: 10_000_000,
        tif: 'IOC',
        postOnly: true
      })
    ).toEqual({ ok: false, code: 'INVALID_COMBINATION' });

    expect(
      validateOrder({
        price: 500_000_000,
        qty: 10_000_000,
        tif: 'FOK',
        postOnly: true
      })
    ).toEqual({ ok: false, code: 'INVALID_COMBINATION' });
  });

  it('P2-T32: tif is GTD -> INVALID_TIF', () => {
    const res = validateOrder({
      price: 500_000_000,
      qty: 10_000_000,
      tif: 'GTD'
    });
    expect(res).toEqual({ ok: false, code: 'INVALID_TIF' });
  });
});

describe('Phase 2 - New Order Types in Engine (P2-T01 to P2-T09)', () => {
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

  // P2-T01
  it('P2-T01: IOC buy 0.7 at 50,05,000 -> 3 trades, 0.6 total, OrderCancelled(IOC_REMAINDER, 0.1), does not rest', () => {
    createBookA(engine);
    const events = engine.process({
      type: 'PLACE',
      ts: ts + 10,
      order: { id: 'IOC_1', userId: 'Taker', side: 'BUY', price: inr(5005000), qty: btc('0.7'), tif: 'IOC' }
    });

    const trades = events.filter((e) => e.type === 'TradeExecuted');
    expect(trades).toHaveLength(3);
    const totalTraded = trades.reduce((sum, t) => sum + t.qty, 0);
    expect(totalTraded).toBe(btc('0.6'));

    const cancelled = events.find((e) => e.type === 'OrderCancelled');
    expect(cancelled).toEqual({
      seq: expect.any(Number),
      type: 'OrderCancelled',
      orderId: 'IOC_1',
      reason: 'IOC_REMAINDER',
      remaining: btc('0.1')
    });

    // Remainder does not rest in the book
    expect(engine.book.hasOrder('IOC_1')).toBe(false);
    expect(engine.bestBid().price).toBe(inr(5000000));
  });

  // P2-T02
  it('P2-T02: IOC buy 0.1 at 49,99,000, no cross -> OrderAccepted then OrderCancelled(IOC_REMAINDER, 0.1), nothing rests', () => {
    createBookA(engine);
    const events = engine.process({
      type: 'PLACE',
      ts: ts + 10,
      order: { id: 'IOC_2', userId: 'Taker', side: 'BUY', price: inr(4999000), qty: btc('0.1'), tif: 'IOC' }
    });

    expect(events).toEqual([
      {
        seq: expect.any(Number),
        type: 'OrderAccepted',
        orderId: 'IOC_2',
        side: 'BUY',
        price: inr(4999000),
        qty: btc('0.1'),
        tif: 'IOC'
      },
      {
        seq: expect.any(Number),
        type: 'OrderCancelled',
        orderId: 'IOC_2',
        reason: 'IOC_REMAINDER',
        remaining: btc('0.1')
      }
    ]);
    expect(engine.book.hasOrder('IOC_2')).toBe(false);
  });

  // P2-T03
  it('P2-T03: FOK buy 0.6 at 50,05,000 -> Fillable (0.2 + 0.3 + 0.1), 3 trades, nothing rests', () => {
    createBookA(engine);
    const events = engine.process({
      type: 'PLACE',
      ts: ts + 10,
      order: { id: 'FOK_1', userId: 'Taker', side: 'BUY', price: inr(5005000), qty: btc('0.6'), tif: 'FOK' }
    });

    const trades = events.filter((e) => e.type === 'TradeExecuted');
    expect(trades).toHaveLength(3);
    const totalTraded = trades.reduce((sum, t) => sum + t.qty, 0);
    expect(totalTraded).toBe(btc('0.6'));
    expect(engine.book.hasOrder('FOK_1')).toBe(false);
  });

  // P2-T04
  it('P2-T04: FOK buy 0.7 at 50,05,000 -> Only 0.6 fillable -> OrderRejected(FOK_NOT_FILLABLE), book unchanged, eventSeq + 1', () => {
    createBookA(engine);
    const prevSeq = engine.eventSeq;
    const events = engine.process({
      type: 'PLACE',
      ts: ts + 10,
      order: { id: 'FOK_2', userId: 'Taker', side: 'BUY', price: inr(5005000), qty: btc('0.7'), tif: 'FOK' }
    });

    expect(events).toEqual([
      {
        seq: prevSeq,
        type: 'OrderRejected',
        orderId: 'FOK_2',
        reason: 'FOK_NOT_FILLABLE'
      }
    ]);
    expect(engine.eventSeq).toBe(prevSeq + 1);
    expect(engine.book.hasOrder('FOK_2')).toBe(false);
    expect(engine.bestAsk().price).toBe(inr(5002000));
  });

  // P2-T05
  it('P2-T05: FOK by user D, buy 0.6 at 50,05,000 -> Walk hits D own S3 after 0.5 -> FOK_NOT_FILLABLE', () => {
    createBookA(engine);
    const prevSeq = engine.eventSeq;
    const events = engine.process({
      type: 'PLACE',
      ts: ts + 10,
      order: { id: 'FOK_D', userId: 'D', side: 'BUY', price: inr(5005000), qty: btc('0.6'), tif: 'FOK' }
    });

    expect(events).toEqual([
      {
        seq: prevSeq,
        type: 'OrderRejected',
        orderId: 'FOK_D',
        reason: 'FOK_NOT_FILLABLE'
      }
    ]);
    expect(engine.book.getOrder('S1').remaining).toBe(btc('0.2'));
    expect(engine.book.getOrder('S3').remaining).toBe(btc('0.1'));
  });

  it('FOK rejects when fillable requires more than maxFills', () => {
    const tinyEngine = createEngine({ maxFills: 2 });
    tinyEngine.process({
      type: 'PLACE',
      ts: 1,
      order: { id: 1, userId: 1, side: 'SELL', price: inr(5000000), qty: 10000 }
    });
    tinyEngine.process({
      type: 'PLACE',
      ts: 2,
      order: { id: 2, userId: 2, side: 'SELL', price: inr(5000000), qty: 10000 }
    });
    tinyEngine.process({
      type: 'PLACE',
      ts: 3,
      order: { id: 3, userId: 3, side: 'SELL', price: inr(5000000), qty: 10000 }
    });

    const res = tinyEngine.process({
      type: 'PLACE',
      ts: 4,
      order: { id: 4, userId: 4, side: 'BUY', price: inr(5000000), qty: 30000, tif: 'FOK' }
    });
    expect(res[0].type).toBe('OrderRejected');
    expect(res[0].reason).toBe('FOK_NOT_FILLABLE');
  });

  it('Post-only SELL rests on empty book', () => {
    const emptyEng = createEngine();
    const res = emptyEng.process({
      type: 'PLACE',
      ts: 1,
      order: { id: 'PO_SELL_EMPTY', userId: 1, side: 'SELL', price: inr(5000000), qty: 10000, postOnly: true }
    });
    expect(res[0].type).toBe('OrderAccepted');
    expect(emptyEng.bestAsk().price).toBe(inr(5000000));
  });

  // P2-T06
  it('P2-T06: Post-only buy at 50,02,000 -> OrderRejected(POST_ONLY_WOULD_CROSS)', () => {
    createBookA(engine);
    const events = engine.process({
      type: 'PLACE',
      ts: ts + 10,
      order: { id: 'PO_1', userId: 'Taker', side: 'BUY', price: inr(5002000), qty: btc('0.1'), postOnly: true, tif: 'GTC' }
    });

    expect(events).toEqual([
      {
        seq: expect.any(Number),
        type: 'OrderRejected',
        orderId: 'PO_1',
        reason: 'POST_ONLY_WOULD_CROSS'
      }
    ]);
    expect(engine.book.hasOrder('PO_1')).toBe(false);
  });

  // P2-T07
  it('P2-T07: Post-only buy at 50,01,000 -> Rests, new best bid 50,01,000', () => {
    createBookA(engine);
    const events = engine.process({
      type: 'PLACE',
      ts: ts + 10,
      order: { id: 'PO_2', userId: 'Maker', side: 'BUY', price: inr(5001000), qty: btc('0.1'), postOnly: true, tif: 'GTC' }
    });

    expect(events).toEqual([
      {
        seq: expect.any(Number),
        type: 'OrderAccepted',
        orderId: 'PO_2',
        side: 'BUY',
        price: inr(5001000),
        qty: btc('0.1'),
        tif: 'GTC'
      }
    ]);
    expect(engine.bestBid().price).toBe(inr(5001000));
  });

  // P2-T08
  it('P2-T08: Post-only sell at 50,00,000 (crosses B1) rejected; then sell at 50,00,100 rests as ask', () => {
    createBookA(engine);
    // Would cross B1 (50,00,000)
    const e1 = engine.process({
      type: 'PLACE',
      ts: ts + 10,
      order: { id: 'PO_S1', userId: 'Maker', side: 'SELL', price: inr(5000000), qty: btc('0.1'), postOnly: true, tif: 'GTC' }
    });
    expect(e1).toEqual([
      {
        seq: expect.any(Number),
        type: 'OrderRejected',
        orderId: 'PO_S1',
        reason: 'POST_ONLY_WOULD_CROSS'
      }
    ]);

    // Sell at 50,00,100 (above best bid 50,00,000)
    const e2 = engine.process({
      type: 'PLACE',
      ts: ts + 11,
      order: { id: 'PO_S2', userId: 'Maker', side: 'SELL', price: inr(5000100), qty: btc('0.1'), postOnly: true, tif: 'GTC' }
    });
    expect(e2[0].type).toBe('OrderAccepted');
    expect(engine.bestAsk().price).toBe(inr(5000100));
  });

  // P2-T09
  it('P2-T09: 60 asks of 0.0001 BTC from 60 users, Buy 0.006 BTC, maxFills is 50 -> 50 trades, OrderCancelled(MAX_FILLS, 0.001 BTC)', () => {
    const customEngine = createEngine({ maxFills: 50 });
    const price = inr(5000000);
    const qtyPerAsk = btc('0.0001'); // 10,000 satoshi

    for (let i = 1; i <= 60; i += 1) {
      customEngine.process({
        type: 'PLACE',
        ts: ts + i,
        order: { id: `ASK_${i}`, userId: `Maker_${i}`, side: 'SELL', price, qty: qtyPerAsk, tif: 'GTC' }
      });
    }

    const buyQty = btc('0.006'); // 600,000 satoshi (60 orders * 10,000)
    const events = customEngine.process({
      type: 'PLACE',
      ts: ts + 100,
      order: { id: 'SWEEP_50', userId: 'BigBuyer', side: 'BUY', price, qty: buyQty, tif: 'GTC' }
    });

    const trades = events.filter((e) => e.type === 'TradeExecuted');
    expect(trades).toHaveLength(50);

    const cancelled = events.find((e) => e.type === 'OrderCancelled');
    expect(cancelled).toEqual({
      seq: expect.any(Number),
      type: 'OrderCancelled',
      orderId: 'SWEEP_50',
      reason: 'MAX_FILLS',
      remaining: btc('0.001') // 10 remaining asks = 0.001 BTC
    });

    expect(customEngine.book.hasOrder('SWEEP_50')).toBe(false);
    expect(customEngine.depth(1).asks).toEqual([[price, btc('0.001')]]);
  });

  // P2-T33
  it('P2-T33: Rebuild from open orders restores exact state of P1-T05', () => {
    createBookA(engine);
    // Execute P1-T05
    engine.process({
      type: 'PLACE',
      ts: ts + 10,
      order: { id: 'T5', userId: 'Taker', side: 'BUY', price: inr(5005000), qty: btc('0.7'), tif: 'GTC' }
    });

    const originalDepth = engine.depth(100);
    const originalOrders = engine.openOrders();

    // Rebuild new engine from openOrders
    const rebuiltEngine = createEngine(
      { marketId: 'BTCINR' },
      { openOrders: originalOrders, startSeq: engine.eventSeq, startTradeNo: engine.tradeNo }
    );

    expect(rebuiltEngine.depth(100)).toEqual(originalDepth);
    expect(rebuiltEngine.openOrders().map((o) => ({ id: o.id, remaining: o.remaining }))).toEqual(
      originalOrders.map((o) => ({ id: o.id, remaining: o.remaining }))
    );

    // Rebuild without startSeq / startTradeNo defaults both to 0
    const defCounterEngine = createEngine(
      { marketId: 'BTCINR' },
      { openOrders: [{ id: 'X1', userId: 'U1', side: 'BUY', price: inr(5000000), remaining: 10000 }] }
    );
    expect(defCounterEngine.eventSeq).toBe(0);
    expect(defCounterEngine.tradeNo).toBe(0);
    expect(defCounterEngine.openOrders()).toHaveLength(1);
  });

  // P2-T34
  it('P2-T34: Replay test with 5,000 commands produces identical events, depth, and openOrders across two engines', () => {
    function mulberry32(a) {
      return function () {
        let t = (a += 0x6d2b79f5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }

    const rng = mulberry32(98765);
    const commands = [];
    const activeIds = [];
    let curTs = 1767225600000;

    for (let i = 1; i <= 5000; i += 1) {
      curTs += 1;
      const roll = rng();

      if (roll >= 0.90 && activeIds.length > 0) {
        const idx = Math.floor(rng() * activeIds.length);
        const orderId = activeIds[idx];
        commands.push({ type: 'CANCEL', ts: curTs, orderId });
      } else {
        const side = roll < 0.45 ? 'BUY' : 'SELL';
        const k = Math.floor(rng() * 101) - 50;
        const price = 500_000_000 + k * 10_000;
        const m = Math.floor(rng() * 20) + 1;
        const qty = 10_000 * m;
        const userId = Math.floor(rng() * 10) + 1;
        const tifRoll = rng();
        const tif = tifRoll < 0.7 ? 'GTC' : tifRoll < 0.85 ? 'IOC' : 'FOK';
        const postOnly = tif === 'GTC' && rng() < 0.2;

        const orderId = `CMD_${i}`;
        activeIds.push(orderId);
        commands.push({
          type: 'PLACE',
          ts: curTs,
          order: { id: orderId, userId, side, price, qty, tif, postOnly }
        });
      }
    }

    const engineA = createEngine();
    const engineB = createEngine();

    const eventsA = commands.flatMap((cmd) => engineA.process(cmd));
    const eventsB = commands.flatMap((cmd) => engineB.process(cmd));

    expect(eventsA).toEqual(eventsB);
    expect(engineA.depth(100)).toEqual(engineB.depth(100));
    expect(engineA.openOrders().map((o) => o.id)).toEqual(engineB.openOrders().map((o) => o.id));
  });
});
