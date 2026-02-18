# Market Adapter Interface Design

## Overview

The Market Adapter layer provides a unified interface for interacting with different prediction market platforms. This abstraction allows our trading engine to work seamlessly across Kalshi, Polymarket, and future platforms.

## Design Principles

1. **Platform Agnostic**: Core trading logic should not depend on platform-specific implementations
2. **Fail-Safe**: Graceful degradation and clear error handling
3. **Extensible**: Easy to add new platforms without modifying core code
4. **Testable**: Mock implementations for testing strategies without real money

## Interface Definition

### Core Market Adapter Interface

```python
from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any
from datetime import datetime
from decimal import Decimal

class MarketAdapter(ABC):
    """Abstract base class for all market platform adapters."""
    
    @abstractmethod
    async def get_markets(self, 
                         active_only: bool = True,
                         category: Optional[str] = None) -> List[Market]:
        """Fetch available markets from the platform."""
        pass
    
    @abstractmethod
    async def get_market_details(self, market_id: str) -> MarketDetails:
        """Get detailed information about a specific market."""
        pass
    
    @abstractmethod
    async def get_order_book(self, market_id: str) -> OrderBook:
        """Fetch current order book (bids/asks) for a market."""
        pass
    
    @abstractmethod
    async def place_order(self, order: Order) -> OrderResult:
        """Submit an order to the market."""
        pass
    
    @abstractmethod
    async def cancel_order(self, order_id: str) -> CancelResult:
        """Cancel an existing order."""
        pass
    
    @abstractmethod
    async def get_positions(self) -> List[Position]:
        """Get all current positions."""
        pass
    
    @abstractmethod
    async def get_order_history(self, 
                               market_id: Optional[str] = None,
                               limit: int = 100) -> List[Order]:
        """Fetch historical orders."""
        pass
    
    @abstractmethod
    async def subscribe_to_market_updates(self, 
                                         market_id: str,
                                         callback: Callable) -> Subscription:
        """Subscribe to real-time market updates."""
        pass
```

## Data Models

### Market
```python
@dataclass
class Market:
    id: str
    platform: str
    title: str
    description: str
    category: str
    created_at: datetime
    closes_at: datetime
    resolved_at: Optional[datetime]
    outcome_type: str  # 'binary', 'multiple_choice', 'numeric'
    outcomes: List[Outcome]
    volume: Decimal
    liquidity: Decimal
    metadata: Dict[str, Any]
```

### Order
```python
@dataclass
class Order:
    id: Optional[str]  # None for new orders
    market_id: str
    outcome_id: str
    side: OrderSide  # BUY or SELL
    type: OrderType  # LIMIT or MARKET
    quantity: Decimal
    price: Optional[Decimal]  # Required for LIMIT orders
    time_in_force: TimeInForce  # IOC, GTC, FOK
    metadata: Dict[str, Any]
```

## Order Service Integration

The Order Service sits between the Strategy Framework and Market Adapters:

```
Strategy → Order Service → Market Adapter → External Platform
```

### Order Service Responsibilities

1. **Order Lifecycle Management**
   - Generate unique order IDs
   - Maintain state machine (pending → submitted → filled/cancelled/rejected)
   - Track partial fills

2. **Reliability**
   - Retry logic with exponential backoff
   - Idempotency checks
   - Circuit breaker for platform issues

3. **Audit Trail**
   - Log all order attempts
   - Track state transitions
   - Performance metrics

## Implementation Guidelines

### Error Handling

```python
class MarketAdapterError(Exception):
    """Base exception for market adapter errors."""
    pass

class RateLimitError(MarketAdapterError):
    """Raised when platform rate limits are hit."""
    retry_after: int  # seconds

class InsufficientFundsError(MarketAdapterError):
    """Raised when account has insufficient funds."""
    required: Decimal
    available: Decimal

class MarketClosedError(MarketAdapterError):
    """Raised when attempting to trade in a closed market."""
    market_id: str
    closed_at: datetime
```

### Platform-Specific Adapters

Each platform adapter should:
1. Implement the full MarketAdapter interface
2. Handle platform-specific authentication
3. Map platform data models to our standardized models
4. Implement rate limiting and retry logic
5. Provide mock mode for testing

## Testing Strategy

1. **Unit Tests**: Mock adapter implementations
2. **Integration Tests**: Sandbox/testnet environments
3. **End-to-End Tests**: Small real money trades with strict limits

## Security Considerations

1. API keys stored in secure vault (AWS Secrets Manager)
2. Separate keys for each environment
3. Rate limiting to prevent accidental DoS
4. Position limits enforced at multiple levels
5. Read-only keys for monitoring systems

## Next Steps

1. Implement base classes and interfaces
2. Create Kalshi adapter as first implementation
3. Build comprehensive test suite
4. Add monitoring and alerting
