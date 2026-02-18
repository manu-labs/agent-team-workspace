# Prediction Markets Trading Backend

This directory contains the core backend services for the prediction markets trading system.

## Structure

- **core/** - Core trading engine and abstractions
  -  - Platform-specific API integrations
  -  - Order management and execution
  -  - Position limits and risk controls
  -  - Plugin system for trading strategies
  
- **services/** - Microservices
  -  - Order lifecycle management
  -  - Market data ingestion
  -  - Performance metrics and backtesting

- **infrastructure/** - Shared infrastructure code
  -  - Database schemas and migrations
  -  - Event bus and message queue interfaces
  -  - Logging and metrics

## Getting Started

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your API keys
```

3. Run migrations:
```bash
python manage.py migrate
```

## Development

- Follow PEP 8 style guidelines
- Write tests for all new functionality
- Use type hints for better code clarity
