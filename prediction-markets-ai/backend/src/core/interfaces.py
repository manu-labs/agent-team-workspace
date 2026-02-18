"""Abstract interfaces for market adapters and core components"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import List, Optional, Dict, Any


class OrderType(Enum):
    MARKET = "market"
    LIMIT = "limit"


class OrderSide(Enum):
    BUY = "buy"
    SELL = "sell"


class OrderStatus(Enum):
    PENDING = "pending"
    SUBMITTED = "submitted"
    PARTIAL_FILL = "partial_fill"
    FILLED = "filled"
    CANCELLED = "cancelled"
    REJECTED = "rejected"


@dataclass
class Market:
    """Represents a prediction market"""
    id: str
    platform: str
    title: str
    description: str
    end_date: datetime
    volume: Decimal
    open_interest: Decimal
    last_price: Optional[Decimal] = None
    metadata: Dict[str, Any] = None


@dataclass
class OrderBook:
    """Market order book snapshot"""
    market_id: str
    timestamp: datetime
    bids: List[tuple[Decimal, Decimal]]  # (price, quantity)
    asks: List[tuple[Decimal, Decimal]]  # (price, quantity)
    spread: Optional[Decimal] = None


@dataclass
class Order:
    """Trading order"""
    id: Optional[str] = None
    market_id: str = None
    side: OrderSide = None
    order_type: OrderType = None
    quantity: Decimal = None
    price: Optional[Decimal] = None  # For limit orders
    status: OrderStatus = OrderStatus.PENDING
    created_at: Optional[datetime] = None
    filled_at: Optional[datetime] = None
    filled_quantity: Optional[Decimal] = None
    average_price: Optional[Decimal] = None


@dataclass
class Position:
    """Current position in a market"""
    market_id: str
    quantity: Decimal
    average_price: Decimal
    current_price: Decimal
    unrealized_pnl: Decimal
    realized_pnl: Decimal


class MarketAdapter(ABC):
    """Abstract interface for prediction market platforms"""
    
    @abstractmethod
    async def connect(self) -> None:
        """Initialize connection to the platform"""
        pass
    
    @abstractmethod
    async def disconnect(self) -> None:
        """Close connection to the platform"""
        pass
    
    @abstractmethod
    async def get_markets(self) -> List[Market]:
        """Get list of available markets"""
        pass
    
    @abstractmethod
    async def get_market_details(self, market_id: str) -> Market:
        """Get detailed information about a specific market"""
        pass
    
    @abstractmethod
    async def get_order_book(self, market_id: str) -> OrderBook:
        """Get current order book for a market"""
        pass
    
    @abstractmethod
    async def place_order(self, order: Order) -> Order:
        """Place an order on the market"""
        pass
    
    @abstractmethod
    async def cancel_order(self, order_id: str) -> bool:
        """Cancel an existing order"""
        pass
    
    @abstractmethod
    async def get_order_status(self, order_id: str) -> Order:
        """Get status of an order"""
        pass
    
    @abstractmethod
    async def get_positions(self) -> List[Position]:
        """Get all current positions"""
        pass
    
    @abstractmethod
    async def get_balance(self) -> Decimal:
        """Get account balance"""
        pass


class TradingStrategy(ABC):
    """Abstract interface for trading strategies"""
    
    @abstractmethod
    async def analyze_market(self, market: Market, order_book: OrderBook) -> Optional[Order]:
        """Analyze market and return order if opportunity exists"""
        pass
    
    @abstractmethod
    def get_name(self) -> str:
        """Return strategy name"""
        pass
    
    @abstractmethod
    def get_risk_parameters(self) -> Dict[str, Any]:
        """Return current risk parameters"""
        pass
