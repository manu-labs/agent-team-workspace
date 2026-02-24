"""Fee and spread calculator for arbitrage opportunities."""


def kalshi_fee(price: float) -> float:
    """Calculate Kalshi fee: 0.07 * price * (1 - price), capped at $0.02."""
    fee = 0.07 * price * (1 - price)
    return min(fee, 0.02)


def polymarket_fee(price: float) -> float:
    """Polymarket fee -- zero for most markets."""
    return 0.0


def calculate_spread(
    poly_yes: float,
    kalshi_yes: float,
) -> dict:
    """Calculate raw and fee-adjusted spread between platforms.

    Returns dict with raw_spread, fee_adjusted_spread, and per-platform fees.
    """
    raw_spread = abs(poly_yes - kalshi_yes)

    poly_fee = polymarket_fee(poly_yes)
    kalshi_fee_val = kalshi_fee(kalshi_yes)

    fee_adjusted = raw_spread - poly_fee - kalshi_fee_val

    return {
        "raw_spread": round(raw_spread, 4),
        "fee_adjusted_spread": round(max(0, fee_adjusted), 4),
        "polymarket_fee": round(poly_fee, 4),
        "kalshi_fee": round(kalshi_fee_val, 4),
    }