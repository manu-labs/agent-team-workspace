# System Architecture

## Overview

The AI Trading Agents system uses a modular monolith architecture designed for high performance and reliability in financial trading.

## Core Principles

1. **Event-Driven**: All market data and trading actions flow through event streams
2. **Fault Tolerant**: Graceful degradation and recovery from failures
3. **Auditable**: Complete audit trail of all trading decisions and actions
4. **Testable**: Comprehensive testing at unit, integration, and system levels

## Service Boundaries

### Market Adapter Service
- Abstracts exchange-specific APIs
- Normalizes market data
- Handles authentication and rate limiting

### Order Service
- Single source of truth for order state
- Manages order lifecycle
- Handles retries and idempotency

### Strategy Service
- Executes trading strategies
- Emits trading signals
- Manages strategy parameters

### Risk Service
- Enforces position limits
- Monitors exposure
- Triggers circuit breakers

## Data Flow

```
Market Data -> Adapter -> Event Stream -> Strategy Engine -> Risk Check -> Order Service -> Exchange
```

## Technology Choices

- **Python**: Primary language for backend services
- **FastAPI**: REST API framework
- **PostgreSQL**: Historical data and audit logs
- **Redis**: Real-time state and caching
- **RabbitMQ**: Message broker for event streaming
- **Docker**: Containerization
- **AWS**: Cloud infrastructure
