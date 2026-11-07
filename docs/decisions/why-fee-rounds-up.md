# Decision Record: Why Fees Use Ceiling Rounding

## Context
Exchange fees are calculated on trade notional value in basis points (bps, where $1\text{ bps} = 0.01\% = \frac{1}{10,000}$).
Micro-trades or low-fee tiers can result in fractional paise amounts (e.g. 12,345 paise at 10 bps yields 12.345 paise; 1 paisa at 10 bps yields 0.001 paise).

## Alternatives Considered
1. **Floor Rounding (Standard Integer Division)**:
   - Any trade whose calculated fee is $< 1$ paisa computes to $0$ paise fee.
   - Attackers can deliberately slice orders into micro-lots to execute trades completely fee-free, draining exchange economics and encouraging order-book spam.
2. **Banker's / Half-Even Rounding**:
   - Requires floating-point conversion or complex modulo branching, degrading throughput and still leaving edge-cases where micro-trades pay zero fee.
3. **Ceiling Rounding (`(notional * bps + 9_999n) / 10_000n`)**:
   - Any non-zero trade pays at least $1$ paisa ($1\text{n}$).
   - Exact integer arithmetic with zero floating-point operations.

## Decision
All exchange fees compute via **ceiling rounding**:
$$\text{fee} = \begin{cases} 0 & \text{if notional} = 0 \\ \left\lfloor\frac{\text{notional} \times \text{bps} + 9,999}{10,000}\right\rfloor & \text{otherwise} \end{cases}$$

## Consequences
- A real trade never trades for free; every non-zero execution contributes at least $1$ paisa of exchange revenue.
- Protects the exchange against micro-lot fee evasion exploits.
- Exact, deterministic BigInt arithmetic with zero decimal error.
