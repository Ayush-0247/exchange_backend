# Decision Record: Why Market Orders Become IOC Limit Orders at Gateway

## Context
Traders frequently request "Market Orders" expecting immediate execution against whatever liquidity is resting on the book. However, in continuous double-auction matching engines, pure unrestricted market orders present extreme operational and client-protection hazards.

## Alternatives Considered
1. **Engine-Native Unpriced Market Orders**:
   - The engine matches against whatever asks or bids exist until filled or book emptied.
   - If a flash crash, fat-finger, or thin order book occurs, a market buy can sweep orders all the way up to astronomical prices (e.g., buying BTC at ₹10 crore instead of ₹50 lakh).
   - Requires specialized branches and state in the engine core, compromising engine purity and simplicity.
2. **Gateway-Synthesized Immediate-Or-Cancel (IOC) with Protection Price**:
   - The gateway or API layer queries the current best opposite price before placing.
   - It computes an algorithmic `protectionPrice({ side, bestOppositePrice, slippageBps, tickSize })` (e.g. 100 bps = 1% slippage cap).
   - It converts the trader's request into a standard limit order with `tif: 'IOC'` priced at the capped boundary.

## Decision
The matching engine **does not have a native 'MARKET' order type**.
All market orders are converted by the gateway into **IOC limit orders bounded by the calculated protection price**.

## Consequences
- **Price Protection**: The trader is guaranteed never to execute beyond their slippage tolerance.
- **Immediate Execution & No Resting**: Any unfilled remainder is immediately cancelled (`IOC_REMAINDER`) and never sits on the book.
- **Engine Simplicity**: The matching engine core only needs to implement deterministic limit matching with standard TIF modes (`GTC`, `IOC`, `FOK`).
