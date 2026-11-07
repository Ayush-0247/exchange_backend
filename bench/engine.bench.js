import os from 'os';
import { createEngine } from '../src/engine/engine.js';

/**
 * 32-bit PRNG with deterministic seed.
 * @param {number} a Seed
 * @returns {() => number}
 */
function mulberry32(a) {
  let state = a;
  return function () {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Runs the benchmark per PRD section 10 specification.
 */
export function runBenchmark() {
  console.log('=== Matching Engine Benchmark ===');
  const rng = mulberry32(42);
  const engine = createEngine();

  const TOTAL_COMMANDS = 1_000_000;
  const WARMUP_COMMANDS = 100_000;
  const MEASURE_COMMANDS = TOTAL_COMMANDS - WARMUP_COMMANDS;

  let nextOrderId = 1;
  const activeOrderIds = [];
  let baseTs = 1767225600000;

  /**
   * Generates next command per PRD mix.
   * 45% BUY, 45% SELL, 10% CANCEL.
   */
  function nextCommand() {
    baseTs += 1;
    const roll = rng();

    if (roll >= 0.90 && activeOrderIds.length > 0) {
      // CANCEL 10%
      const idx = Math.floor(rng() * activeOrderIds.length);
      const orderId = activeOrderIds[idx];
      activeOrderIds[idx] = activeOrderIds[activeOrderIds.length - 1];
      activeOrderIds.pop();
      return { type: 'CANCEL', ts: baseTs, orderId };
    }

    // PLACE (45% BUY, 45% SELL)
    const side = roll < 0.45 ? 'BUY' : 'SELL';
    const k = Math.floor(rng() * 101) - 50; // -50 to 50
    const price = 500_000_000 + k * 10_000;
    const m = Math.floor(rng() * 500) + 1; // 1 to 500
    const qty = 10_000 * m;
    const userId = Math.floor(rng() * 50) + 1; // 50 simulated trading participants
    const orderId = nextOrderId++;

    return {
      type: 'PLACE',
      ts: baseTs,
      order: {
        id: orderId,
        userId,
        side,
        price,
        qty,
        tif: 'GTC',
        postOnly: false
      }
    };
  }

  console.log(`Running warm-up (${WARMUP_COMMANDS.toLocaleString()} commands)...`);
  for (let i = 0; i < WARMUP_COMMANDS; i += 1) {
    const cmd = nextCommand();
    engine.process(cmd);
    if (cmd.type === 'PLACE') {
      if (engine.book.hasOrder(cmd.order.id)) {
        activeOrderIds.push(cmd.order.id);
      }
    }
  }

  console.log(`Measuring ${MEASURE_COMMANDS.toLocaleString()} commands...`);
  const latencies = [];
  const startTime = process.hrtime.bigint();

  for (let i = 0; i < MEASURE_COMMANDS; i += 1) {
    const cmd = nextCommand();
    const isSample = i % 100 === 0;

    let t0 = 0n;
    if (isSample) {
      t0 = process.hrtime.bigint();
    }

    engine.process(cmd);

    if (isSample) {
      const t1 = process.hrtime.bigint();
      latencies.push(Number(t1 - t0)); // nanoseconds
    }

    if (cmd.type === 'PLACE') {
      if (engine.book.hasOrder(cmd.order.id)) {
        activeOrderIds.push(cmd.order.id);
      }
    }
  }

  const endTime = process.hrtime.bigint();
  const totalElapsedNs = Number(endTime - startTime);
  const totalElapsedSec = totalElapsedNs / 1e9;
  const ordersPerSec = Math.round(MEASURE_COMMANDS / totalElapsedSec);

  // Latency percentiles
  latencies.sort((a, b) => a - b);
  const p50Ns = latencies[Math.floor(latencies.length * 0.50)];
  const p95Ns = latencies[Math.floor(latencies.length * 0.95)];
  const p99Ns = latencies[Math.floor(latencies.length * 0.99)];

  const p50Us = (p50Ns / 1000).toFixed(2);
  const p95Us = (p95Ns / 1000).toFixed(2);
  const p99Us = (p99Ns / 1000).toFixed(2);

  const cpuModel = os.cpus()[0]?.model || 'Generic Linux x86_64';
  const nodeVersion = process.version;
  const finalBookSize = engine.book.ordersById.size;
  const totalTrades = engine.tradeNo - 1;

  console.log('\n--- Benchmark Results ---');
  console.log(`Node version:     ${nodeVersion}`);
  console.log(`CPU model:        ${cpuModel}`);
  console.log(`Measured:         ${MEASURE_COMMANDS.toLocaleString()} commands`);
  console.log(`Total duration:   ${totalElapsedSec.toFixed(3)}s`);
  console.log(`Throughput:       ${ordersPerSec.toLocaleString()} orders/sec`);
  console.log(`Latency p50:      ${p50Us} µs`);
  console.log(`Latency p95:      ${p95Us} µs`);
  console.log(`Latency p99:      ${p99Us} µs`);
  console.log(`Final book size:  ${finalBookSize.toLocaleString()} orders`);
  console.log(`Total trades:     ${totalTrades.toLocaleString()}`);
  console.log('-------------------------\n');

  return {
    nodeVersion,
    cpuModel,
    ordersPerSec,
    totalElapsedSec,
    p50Us,
    p95Us,
    p99Us,
    finalBookSize,
    totalTrades
  };
}

// Auto-run if executed directly via CLI
if (process.argv[1] && process.argv[1].endsWith('engine.bench.js')) {
  runBenchmark();
}
