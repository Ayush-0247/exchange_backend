# Decision Record: Why Trades Execute at the Maker Resting Price

## Context
When an incoming aggressive order (taker) crosses the resting orders on the book, the taker's limit price may be more generous than the maker's resting price (e.g., Maker is resting to sell at 50,02,000 paise, while an incoming buyer is willing to buy at up to 50,10,000 paise).

## Alternatives Considered
1. **Taker Price (50,10,000)**:
   - The maker receives an unexpected windfall (selling higher than their posted offer).
   - This punishes aggressive market participants, creates adverse selection, and disincentivizes active liquidity takers from submitting high limit bounds.
2. **Midpoint / Split Price**:
   - Complex, non-standard, and leads to pricing drift between discrete ticks.
3. **Maker Resting Price (50,02,000)**:
   - The trade executes at the maker's pre-committed price.

## Decision
All trades execute at the **maker's resting price**.

## Rationale & Market Microstructure
1. **Price Improvement**:
   - The taker receives "price improvement" ($50,10,000 \to 50,02,000$, saving $8,000$ paise per unit). This rewards takers for providing crossing demand while guaranteeing they never trade worse than their submitted limit.
2. **Honoring Pre-Committed Liquidity**:
   - The maker was already resting and committed to trade at their specified quote. They get filled at the exact price they asked for.
3. **Standard Industry Convention**:
   - Continuous double auction exchanges (CME, Nasdaq, Binance, Coinbase, NSE) execute crossing orders at the maker price.
