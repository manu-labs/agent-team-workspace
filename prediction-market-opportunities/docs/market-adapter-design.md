# Market Adapter Interface Design

## Overview

The Market Adapter Interface provides a unified abstraction layer for interacting with different prediction market platforms. This allows our trading system to be platform-agnostic while supporting platform-specific features.

## Core Principles

1. **Platform Agnostic**: Core trading logic should not depend on specific platform implementations
2. **Extensible**: Easy to add new platforms without modifying existing code
3. **Type Safe**: Strong typing for all data structures
4. **Async First**: All operations are asynchronous for better performance
5. **Error Handling**: Consistent error handling across platforms

## Interface Definition

```python
from abc import ABC, abstractmethod
from typing import List, Optional
from datetime import datetime
from decimal import Decimal

class MarketAdapter(ABC):
    """Abstract base class for market platform adapters"""
    
    @abstractmethod
    async def authenticate(self, credentials: dict) -> bool:
        """Authenticate with the platform"""
        pass
    
    @abstractmethod
    async def get_markets(self, 
                         status: Optional[str] = None,
                         category: Optional[str] = None,
                         limit: int = 100) -> List[Market]:
        """Fetch available markets"""
        pass
    
    @abstractmethod
    async def get_market_details(self, market_id: str) -> MarketDetails:
        """Get detailed information about a specific market"""
        pass
    
    @abstractmethod
    async def get_order_book(self, market_id: str) -> OrderBook:
        """Get current order book for a market"""
        pass
    
    @abstractmethod
    async def place_order(self, order: Order) -> OrderResult:
        """Submit an order to the market"""
        pass
    
    @abstractmethod
    async def cancel_order(self, order_id: str) -> CancelResult:
        """Cancel an existing order"""
        pass
    
    @abstractmethod
    async def get_positions(self) -> List[Position]:
        """Get current positions"""
        pass
    
    @abstractmethod
    async def get_order_history(self, 
                               market_id: Optional[str] = None,
                               limit: int = 100) -> List[Order]:
        """Get historical orders"""
        pass
    
    @abstractmethod
    async def subscribe_market_data(self, 
                                   market_id: str,
                                   callback: Callable) -> Subscription:
        """Subscribe to real-time market updates"""
        pass
```

## Data Models

```python
@dataclass
class Market:
    id: str
    title: str
    description: str
    status: MarketStatus  # OPEN, CLOSED, RESOLVED
    created_at: datetime
    closes_at: Optional[datetime]
    resolution_date: Optional[datetime]
    category: str
    tags: List[str]
    url: str
    
@dataclass
class MarketDetails(Market):
    rules: str
    volume_24h: Decimal
    liquidity: Decimal
    num_traders: int
    probabilities: Dict[str, Decimal]  # outcome -> probability
    
@dataclass
class Order:
    id: Optional[str]  # None for new orders
    market_id: str
    side: OrderSide  # BUY, SELL
    outcome: str  # YES, NO, or specific outcome
    quantity: Decimal
    price: Decimal
    order_type: OrderType  # MARKET, LIMIT
    time_in_force: TimeInForce  # GTC, IOC, FOK
    
@dataclass
class Position:
    market_id: str
    outcome: str
    quantity: Decimal
    avg_price: Decimal
    current_price: Decimal
    pnl: Decimal
    pnl_percent: Decimal
```

## Platform-Specific Adapters

### KalshiAdapter

- Implements REST API v2
- Supports all order types
- Rate limit: 10 requests/second
- WebSocket for real-time data

### PolymarketAdapter

- Implements GraphQL API
- Requires Web3 wallet integration
- Gas optimization for orders
- IPFS for market metadata

### ManifoldAdapter

- REST API with mana currency
- Free response markets support
- Unique betting mechanisms

## Order Service Integration

The Order Service acts as a middleware layer between the strategy framework and market adapters:

```
Strategy -> Order Service -> Market Adapter -> Platform API
```

### Order Service Responsibilities

1. **Order Lifecycle Management**
   - Generate unique order IDs
   - Track order states (PENDING, SUBMITTED, FILLED, CANCELLED, REJECTED)
   - Handle partial fills
   
2. **Reliability**
   - Retry failed requests with exponential backoff
   - Deduplicate requests using idempotency keys
   - Circuit breaker for platform outages
   
3. **Audit Trail**
   - Log all operations with timestamps
   - Record request/response payloads
   - Track performance metrics

## Error Handling

```python
class MarketAdapterError(Exception):
    """Base exception for market adapter errors"""
    
class AuthenticationError(MarketAdapterError):
    """Failed to authenticate with platform"""
    
class MarketNotFoundError(MarketAdapterError):
    """Requested market does not exist"""
    
class InsufficientFundsError(MarketAdapterError):
    """Not enough funds to place order"""
    
class RateLimitError(MarketAdapterError):
    """API rate limit exceeded"""
    retry_after: int  # seconds to wait
```

## Testing Strategy

1. **Unit Tests**: Mock platform responses
2. **Integration Tests**: Use platform sandboxes
3. **Contract Tests**: Verify adapter contract compliance
4. **Load Tests**: Ensure performance under load

## Security Considerations

1. API keys stored in secure vault (e.g., AWS Secrets Manager)
2. All requests use HTTPS
3. Request signing for platforms that require it
4. IP allowlisting where supported
5. Separate keys for dev/staging/prod

## Future Enhancements

1. Multi-account support
2. Cross-platform arbitrage helpers
3. Unified position management
4. Advanced order types (OCO, trailing stop)
5. Historical data replay for backtesting
