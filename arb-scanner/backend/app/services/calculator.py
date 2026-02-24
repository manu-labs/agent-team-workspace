"""Fee and spread calculator for arbitrage opportunities.

Checks both directions (buy poly/sell kalshi, buy kalshi/sell poly)
and returns the profitable direction with fee-adjusted spread.
"""


def kalshi_fee(price: float) -> float:
    """Calculate Kalshi fee: 0.07 * price * (1 - price), capped at $0.02."""
    fee = 0.07 * price * (1 - price)
    return min(fee, 0.02)


def polymarket_fee(price: float) -> float:
    """Polymarket fee -- zero for most markets."""
    return 0.0


def calculate_spread(poly_yes: float, kalshi_yes: float) -> dict:
    """Calculate fee-adjusted spread checking both directions.

    Direction 1: Buy YES on Kalshi (cheaper), sell YES on Polymarket (more expensive)
      Profit = poly_yes - kalshi_yes - kalshi_fee(kalshi_yes) - polymarket_fee(poly_yes)

    Direction 2: Buy YES on Polymarket (cheaper), sell YES on Kalshi (more expensive)
      Profit = kalshi_yes - poly_yes - polymarket_fee(poly_yes) - kalshi_fee(kalshi_yes)

    Returns the more profitable direction.
    """
    raw_spread = abs(poly_yes - kalshi_yes)

    k_fee = kalshi_fee(kalshi_yes)
    p_fee = polymarket_fee(poly_yes)

    if poly_yes >= kalshi_yes:
        direction = "buy_kalshi_sell_poly"
        profit = poly_yes - kalshi_yes - k_fee - p_fee
    else:
        direction = "buy_poly_sell_kalshi"
        profit = kalshi_yes - poly_yes - p_fee - k_fee

    fee_adjusted = max(0, profit)

    return {
        "raw_spread": round(raw_spread, 4),
        "fee_adjusted_spread": round(fee_adjusted, 4),
        "polymarket_fee": round(p_fee, 4),
        "kalshi_fee": round(k_fee, 4),
        "direction": direction,
        "profitable": fee_adjusted > 0,
    }