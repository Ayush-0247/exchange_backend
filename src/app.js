import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createEngine } from './engine/engine.js';
import { runBenchmark } from '../bench/engine.bench.js';
import { notional } from './money/units.js';
import { fee } from './money/fees.js';
import { formatInr, formatBtc } from './money/format.js';
import { protectionPrice } from './rules/protection.js';
import { validateOrder } from './rules/order.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

export const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(rootDir));

let engine = createEngine();

/**
 * Resets the engine to standard Book A from specification.
 */
function loadBookA() {
  engine = createEngine();
  const bookACommands = [
    { type: 'PLACE', ts: 1767225600001, order: { id: 'B1', userId: 'F', side: 'BUY', price: 500000000, qty: 40000000, tif: 'GTC' } },
    { type: 'PLACE', ts: 1767225600002, order: { id: 'B2', userId: 'G', side: 'BUY', price: 499800000, qty: 70000000, tif: 'GTC' } },
    { type: 'PLACE', ts: 1767225600003, order: { id: 'B3', userId: 'H', side: 'BUY', price: 499500000, qty: 100000000, tif: 'GTC' } },
    { type: 'PLACE', ts: 1767225600004, order: { id: 'S1', userId: 'B', side: 'SELL', price: 500200000, qty: 20000000, tif: 'GTC' } },
    { type: 'PLACE', ts: 1767225600005, order: { id: 'S2', userId: 'C', side: 'SELL', price: 500500000, qty: 30000000, tif: 'GTC' } },
    { type: 'PLACE', ts: 1767225600006, order: { id: 'S3', userId: 'D', side: 'SELL', price: 500500000, qty: 10000000, tif: 'GTC' } },
    { type: 'PLACE', ts: 1767225600007, order: { id: 'S4', userId: 'E', side: 'SELL', price: 501000000, qty: 50000000, tif: 'GTC' } }
  ];
  for (const cmd of bookACommands) {
    engine.process(cmd);
  }
}

// Preload Book A by default
loadBookA();

// API Endpoints

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    phase: 'Phase 2 - Order Types, Money and Proofs',
    marketId: engine.marketId,
    eventSeq: engine.eventSeq,
    tradeNo: engine.tradeNo,
    maxFills: engine.maxFills,
    openOrdersCount: engine.book.ordersById.size
  });
});

app.get('/api/depth', (req, res) => {
  const depth = engine.depth(20);
  const bestBid = engine.bestBid();
  const bestAsk = engine.bestAsk();
  const spread = bestBid && bestAsk ? bestAsk.price - bestBid.price : null;

  res.json({
    bids: depth.bids,
    asks: depth.asks,
    bestBid,
    bestAsk,
    spread
  });
});

app.get('/api/orders', (req, res) => {
  const orders = engine.openOrders().map((o) => ({
    id: o.id,
    userId: o.userId,
    side: o.side,
    price: o.price,
    qty: o.qty,
    remaining: o.remaining,
    tif: o.tif,
    postOnly: o.postOnly
  }));
  res.json({ orders });
});

app.post('/api/process', (req, res) => {
  try {
    const cmd = req.body;
    if (!cmd.ts) {
      cmd.ts = Date.now();
    }
    const events = engine.process(cmd);
    res.json({ success: true, events });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message, name: err.name });
  }
});

app.post('/api/reset-book-a', (req, res) => {
  loadBookA();
  res.json({ success: true, message: 'Book A reloaded successfully' });
});

// Phase 2: Protection Price API
app.post('/api/protection-price', (req, res) => {
  const { side, bestOppositePrice, slippageBps, tickSize } = req.body;
  const result = protectionPrice({
    side,
    bestOppositePrice: bestOppositePrice ?? (side === 'BUY' ? engine.bestAsk()?.price : engine.bestBid()?.price),
    slippageBps: Number(slippageBps || 100),
    tickSize: Number(tickSize || 10000)
  });
  if (result && typeof result === 'object' && result.error) {
    return res.status(400).json({ success: false, error: result.error });
  }
  res.json({ success: true, price: result, formatted: formatInr(result) });
});

// Phase 2: Order Validation API
app.post('/api/validate-order', (req, res) => {
  const { order, marketCfg } = req.body;
  const result = validateOrder(order, marketCfg);
  res.json({ success: true, result });
});

// Phase 2: Money Utilities API
app.post('/api/money/notional', (req, res) => {
  try {
    const { price, qty } = req.body;
    const n = notional(price, qty);
    res.json({
      success: true,
      notionalPaise: n.toString(),
      formattedInr: formatInr(n),
      formattedBtc: formatBtc(qty)
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/money/fee', (req, res) => {
  try {
    const { notional: notionalPaise, bps } = req.body;
    const f = fee(notionalPaise, bps);
    res.json({
      success: true,
      feePaise: f.toString(),
      formattedFeeInr: formatInr(f)
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Phase 2: Rebuild from Open Orders API
app.post('/api/rebuild', (req, res) => {
  try {
    const { openOrders, startSeq, startTradeNo } = req.body;
    engine = createEngine(
      { marketId: 'BTCINR' },
      { openOrders: openOrders || [], startSeq, startTradeNo }
    );
    res.json({
      success: true,
      message: 'Engine rebuilt from open orders',
      depth: engine.depth(20),
      openOrders: engine.openOrders()
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.get('/api/bench', (req, res) => {
  try {
    const result = runBenchmark();
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(rootDir, 'index.html'));
});
