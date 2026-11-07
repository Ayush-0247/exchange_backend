# Mini Crypto Exchange — Phase 1 & Phase 2 (Backend Only)

> **Simulation Disclaimer**: This product is a simulated cryptocurrency exchange designed strictly for educational, testing, and interview demonstration purposes using simulated play money. It is not connected to real banking systems, real cryptocurrency blockchains, or actual capital.

---

## 1. Project Overview

Phase 2 builds upon the pure, deterministic matching engine foundation established in Phase 1, introducing advanced order execution types, exact integer and BigInt monetary mechanics, gateway validation rules, algorithmic market order protection prices, and formal property-based verification.

### Core Capabilities
- **Advanced Order Types (Phase 2)**:
  - **GTC (Good-Til-Cancelled)**: Standard limit order resting in the book with price-time priority.
  - **IOC (Immediate-Or-Cancel)**: Matches crossing liquidity immediately; cancels unexecuted remainder with reason `IOC_REMAINDER`. Never rests in the book.
  - **FOK (Fill-Or-Kill)**: Atomic pre-check walk ensures complete execution before modifying state. If self-orders or insufficient liquidity prevent 100% execution, the order is rejected with `FOK_NOT_FILLABLE` without book alteration.
  - **Post-Only**: Rejects with `POST_ONLY_WOULD_CROSS` if it would match immediately against resting orders, guaranteeing maker status.
  - **Max Fills Cap**: Limits an order execution to at most 50 fills (`maxFills = 50`), cancelling remaining quantity with `MAX_FILLS` to prevent infinite matching sweeps.
- **Monetary Safety (`src/money/`)**:
  - Exact discrete integer units: prices in **paise per BTC** ($1\text{ INR} = 100\text{ paise}$), quantities in **satoshis** ($1\text{ BTC} = 10^8\text{ satoshis}$). Zero decimals.
  - Exact BigInt notional value: `(pricePaise * qtySat) / 100_000_000n`.
  - Ceiling fee rounding: `(notional * bps + 9_999n) / 10_000n` guarantees real trades pay at least 1 paisa (never 0 fee).
  - Indian Rupee and Bitcoin string formatters (`formatInr`, `formatBtc`).
- **Gateway Rules & Market Protection (`src/rules/`)**:
  - `validateOrder(order, marketCfg)`: Refuses bad orders early with standardized codes (`INVALID_TIF`, `INVALID_COMBINATION`, `INVALID_TICK`, `INVALID_LOT`, `BELOW_MIN_NOTIONAL`, `ABOVE_MAX_NOTIONAL`).
  - `protectionPrice({ side, bestOppositePrice, slippageBps, tickSize })`: Caps market orders into bounded IOC limits based on slippage tolerance (1–500 bps).
- **Engine Rebuild from Open Orders**:
  - `createEngine(cfg, { openOrders, startSeq, startTradeNo })` restores book state in time priority without matching or generating spurious events.
- **Formal Invariant Verification (`test/property.test.js`)**:
  - 1,000 runs using `fast-check` verifying all 11 exchange invariants with zero failures.

---

## 2. Benchmark Comparison (Phase 1 vs Phase 2)

Measured on Linux x86_64 with Node.js `v22.23.2` running the 1,000,000 command deterministic benchmark (`mulberry32` PRNG mix: 45% BUY, 45% SELL, 10% CANCEL; 100,000 warm-up commands):

| Metric | Target | Phase 1 Foundation | Phase 2 Order Types & Rules |
|---|---|---|---|
| **Throughput** | $\ge 50,000$ ops/sec | **645,012 orders/sec** | **860,842 orders/sec** |
| **Duration (900k cmds)** | N/A | 1.395s | **1.045s** |
| **Latency p50** | Under 10 µs | 0.63 µs | **0.59 µs** |
| **Latency p95** | Under 50 µs | 1.98 µs | **1.74 µs** |
| **Latency p99** | Under 100 µs | 8.16 µs | **8.17 µs** |
| **Total Trades** | Deterministic | 685,352 trades | 685,352 trades |
| **Final Book Size** | Deterministic | 163,526 orders | 163,526 orders |

---

## 3. Running Tests, Benchmarks & Interactive UI

```bash
# 1. Run all 81 unit, integration, and property tests
npm test

# 2. Run unit tests with code coverage (100% statements/lines, 98.6% branches)
npm run test:cov

# 3. Verify code purity and ESLint rules
npm run lint

# 4. Run the 1,000,000 order benchmark
npm run bench

# 5. Start dev server on port 3000 (serves index.html API tester)
npm run dev
```

---

## 4. Architectural Decision Records (`docs/decisions/`)

- [`why-linked-list.md`](docs/decisions/why-linked-list.md): Why doubly linked lists enable $O(1)$ cancellations and zero-shift queue operations.
- [`why-maker-price.md`](docs/decisions/why-maker-price.md): Why crossing orders execute at the maker resting price (price improvement).
- [`why-integers.md`](docs/decisions/why-integers.md): Why integer paise and satoshis eliminate IEEE 754 precision drift.
- [`why-fee-rounds-up.md`](docs/decisions/why-fee-rounds-up.md): Why ceiling fee rounding prevents micro-lot fee evasion.
- [`why-market-orders-become-ioc-limits.md`](docs/decisions/why-market-orders-become-ioc-limits.md): Why market orders are converted by gateway to bounded IOC limits.
- [`why-fok-needs-pre-check.md`](docs/decisions/why-fok-needs-pre-check.md): Why FOK orders require an atomic pre-check walk instead of rollbacks.
