# Prediction Markets AI Trading System

An autonomous AI-powered trading system for prediction markets, starting with Kalshi and designed to expand to multiple platforms.

## 🎯 Project Overview

This system uses machine learning and algorithmic trading strategies to identify and execute profitable opportunities in prediction markets. Built with a microservices architecture for scalability and platform-agnostic design for flexibility.

## 🏗️ Architecture

### Core Components

- **Trading Engine** - Order execution, position management, risk controls
- **Market Adapters** - Platform-specific integrations (Kalshi, Polymarket, etc.)
- **Strategy Framework** - Pluggable trading strategies
- **ML Pipeline** - Sentiment analysis, probability modeling, pattern recognition
- **Data Infrastructure** - Real-time ingestion, historical storage, analytics
- **Monitoring Dashboard** - Real-time P&L, positions, system health

### Tech Stack

- **Backend**: Python 3.11+ (FastAPI, asyncio)
- **Frontend**: React + TypeScript
- **Database**: PostgreSQL (historical) + Redis (real-time)
- **Message Queue**: Apache Kafka + Redis Pub/Sub
- **ML Framework**: PyTorch + scikit-learn
- **Infrastructure**: AWS (ECS, SQS, RDS), Docker, Terraform
- **Monitoring**: Grafana, Prometheus, CloudWatch

## 📁 Project Structure

```
prediction-markets-ai/
├── backend/              # Trading engine and core services
│   ├── core/            # Core business logic
│   ├── adapters/        # Market platform adapters
│   ├── strategies/      # Trading strategy implementations
│   └── api/            # REST/WebSocket APIs
├── frontend/            # React monitoring dashboard
│   ├── src/
│   └── public/
├── ml/                  # Machine learning models
│   ├── models/         # Trained models
│   ├── training/       # Training pipelines
│   └── inference/      # Inference services
├── infrastructure/      # Infrastructure as code
│   ├── docker/         # Dockerfiles
│   ├── k8s/           # Kubernetes configs
│   └── terraform/      # AWS infrastructure
├── docs/               # Documentation
│   ├── architecture/   # System design docs
│   ├── api/           # API specifications
│   └── strategies/     # Strategy documentation
└── tests/              # Test suites
    ├── unit/
    ├── integration/
    └── e2e/
```

## 🚀 Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- Docker & Docker Compose
- AWS CLI configured
- PostgreSQL 15+
- Redis 7+

### Quick Start

```bash
# Clone the repository
git clone https://github.com/manu-labs/agent-team-workspace.git
cd agent-team-workspace/prediction-markets-ai

# Set up Python environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r backend/requirements.txt

# Set up frontend
cd frontend
npm install

# Configure environment
cp .env.example .env
# Edit .env with your API keys and configuration

# Run with Docker Compose
docker-compose up -d

# Run tests
pytest tests/
```

## 🔒 Security

- All API keys stored in AWS Secrets Manager
- Separate keys for dev/staging/production
- Audit logging for all trades
- Position limits and circuit breakers
- Paper trading mode for testing

## 📊 Trading Strategies

### Currently Implemented
- **Momentum Trading** - Detect and ride market trends
- **Mean Reversion** - Trade on price corrections

### Planned
- **Statistical Arbitrage** - Cross-market opportunities
- **Event-Driven** - News and social sentiment based
- **Market Making** - Provide liquidity, capture spreads

## 🧪 Testing

- Unit tests for all core logic
- Integration tests for market adapters
- End-to-end tests for trading flows
- Backtesting framework for strategies
- Paper trading before real money

## 👥 Team

- **Bob** - Senior Backend Engineer
- **Sara** - Junior Backend Developer  
- **Judy** - Senior Web Developer
- **Artemis** - Junior Web Developer
- **Molly** - Product Manager
- **Christina** - Engineering Manager
- **Sam** - Quality Engineer
- **Fred** - Designer

## 📝 License

Proprietary - All rights reserved

---

Built with ❤️ by the Agent Team
