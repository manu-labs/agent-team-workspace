"""Tests for fee and spread calculator."""
import pytest

from app.services.calculator import kalshi_fee, polymarket_fee, calculate_spread


class TestKalshiFee:
    def test_zero_price(self):
        assert kalshi_fee(0.0) == 0.0

    def test_one_price(self):
        assert kalshi_fee(1.0) == 0.0

    def test_midpoint_max(self):
        # Max fee at p=0.5: 0.07 * 0.5 * 0.5 = 0.0175, below the 0.02 cap
        fee = kalshi_fee(0.5)
        assert abs(fee - 0.0175) < 1e-9

    def test_cap_never_triggered(self):
        # Max possible fee (at p=0.5) is 0.0175 — well below the 0.02 cap
        for p in [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]:
            assert kalshi_fee(p) < 0.02

    def test_symmetric(self):
        # fee(p) == fee(1-p) because p*(1-p) is symmetric around 0.5
        assert abs(kalshi_fee(0.3) - kalshi_fee(0.7)) < 1e-9
        assert abs(kalshi_fee(0.2) - kalshi_fee(0.8)) < 1e-9

    def test_typical_price(self):
        fee = kalshi_fee(0.55)
        expected = 0.07 * 0.55 * 0.45
        assert abs(fee - expected) < 1e-9


class TestPolymarketFee:
    def test_always_zero(self):
        for p in [0.0, 0.1, 0.5, 0.9, 1.0]:
            assert polymarket_fee(p) == 0.0


class TestCalculateSpread:
    def test_buy_kalshi_direction_when_poly_higher(self):
        # poly_yes > kalshi_yes → buy_kalshi_sell_poly
        result = calculate_spread(0.60, 0.55)
        assert result["direction"] == "buy_kalshi_sell_poly"

    def test_buy_poly_direction_when_kalshi_higher(self):
        # kalshi_yes > poly_yes → buy_poly_sell_kalshi
        result = calculate_spread(0.45, 0.55)
        assert result["direction"] == "buy_poly_sell_kalshi"

    def test_raw_spread_is_absolute_difference(self):
        result = calculate_spread(0.60, 0.55)
        assert result["raw_spread"] == round(abs(0.60 - 0.55), 4)

    def test_profitable_when_spread_covers_fees(self):
        # Large spread (0.70 vs 0.50) should be profitable
        result = calculate_spread(0.70, 0.50)
        assert result["fee_adjusted_spread"] > 0
        assert result["profitable"] is True

    def test_not_profitable_when_spread_tiny(self):
        # Tiny spread (0.51 vs 0.50) won't cover fees
        result = calculate_spread(0.51, 0.50)
        assert result["fee_adjusted_spread"] == 0.0
        assert result["profitable"] is False

    def test_equal_prices_zero_spread(self):
        result = calculate_spread(0.50, 0.50)
        assert result["raw_spread"] == 0.0
        assert result["fee_adjusted_spread"] == 0.0
        assert result["profitable"] is False

    def test_returns_all_keys(self):
        result = calculate_spread(0.60, 0.55)
        expected_keys = {
            "raw_spread", "fee_adjusted_spread", "polymarket_fee",
            "kalshi_fee", "direction", "profitable",
        }
        assert set(result.keys()) == expected_keys

    def test_polymarket_fee_always_zero(self):
        result = calculate_spread(0.60, 0.55)
        assert result["polymarket_fee"] == 0.0

    def test_kalshi_fee_in_result(self):
        result = calculate_spread(0.60, 0.55)
        expected = round(kalshi_fee(0.55), 4)
        assert result["kalshi_fee"] == expected

    def test_fee_adjusted_spread_floored_at_zero(self):
        # fee_adjusted_spread must never be negative
        for poly, kalshi in [(0.51, 0.50), (0.50, 0.51), (0.50, 0.50)]:
            result = calculate_spread(poly, kalshi)
            assert result["fee_adjusted_spread"] >= 0

    def test_spread_calculation_buy_kalshi(self):
        poly, kal = 0.65, 0.55
        result = calculate_spread(poly, kal)
        k_fee = kalshi_fee(kal)
        expected_profit = max(0, poly - kal - k_fee - 0.0)
        assert abs(result["fee_adjusted_spread"] - round(expected_profit, 4)) < 1e-6

    def test_spread_calculation_buy_poly(self):
        poly, kal = 0.45, 0.60
        result = calculate_spread(poly, kal)
        k_fee = kalshi_fee(kal)
        expected_profit = max(0, kal - poly - 0.0 - k_fee)
        assert abs(result["fee_adjusted_spread"] - round(expected_profit, 4)) < 1e-6
