# Decision Record: Why Fill-Or-Kill (FOK) Requires an All-or-Nothing Pre-Check Walk

## Context
A Fill-Or-Kill (FOK) order requires that the order be filled completely and immediately; if it cannot be filled completely, it must be rejected immediately without modifying the book or executing partial trades.

## Alternatives Considered
1. **Speculative Execution + Rollback / Snapshot**:
   - Begin executing trades as normal. If the book runs out of crossing liquidity before the order fills completely, rollback all executed trades, restore resting makers, restore previous event sequence, and cancel trade events.
   - Requires state checkpoints, deep cloning or transactional undo-logs, causing massive garbage collection pressure and catastrophic latency degradation in a high-speed engine.
2. **Deterministic Pre-Check Walk (`_checkFokFillable`)**:
   - Prior to modifying any book queues or emitting any events, traverse the resting opposite price levels up to the order's limit price.
   - Accumulate fillable quantity while strictly respecting:
     a) Crossing price condition (price crosses taker limit).
     b) **Self-Trade Prevention (STP)**: If the walk encounters an order belonging to the same `userId`, STP dictates that matching cannot proceed through this order. The walk terminates immediately.
     c) **Max Fills Cap**: If filling the order requires more than `maxFills` (50) executions, the order cannot execute.
   - If accumulated fillable quantity equals or exceeds the requested quantity, the order is guaranteed to fill completely, and execution proceeds deterministically. Otherwise, it immediately returns `OrderRejected(FOK_NOT_FILLABLE)` without altering any book state.

## Decision
The engine executes an in-memory **pre-check walk** on the opposite side before emitting any events or modifying any order nodes.

## Consequences
- **Zero Rollbacks**: No speculative mutations, no rollbacks, and no transaction undo logs.
- **Strict Atomicity**: FOK orders are strictly all-or-nothing: either 100% filled across consecutive trades or rejected with zero state modifications.
- **Accurate STP & Cap Enforcement**: Correctly accounts for self-orders and fill caps during liquidity evaluation.
