# Prediction Market Trading System

An AI-powered autonomous trading system for prediction markets.

## 🎯 Project Goals

- Build autonomous trading agents for prediction markets (Kalshi, Polymarket, Manifold)
- Implement multiple trading strategies (momentum, arbitrage, market making)
- Create real-time monitoring dashboard
- Ensure robust risk management and compliance

## 🏗️ Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│   Backend API   │────▶│  Market APIs    │
│  Dashboard      │     │   Services      │     │  (Kalshi, etc)  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                       │                         │
         └───────────┬───────────┘                         │
                     ▼                                     │
              ┌─────────────┐                              │
              │  Database   │◀─────────────────────────────┘
              │ PostgreSQL  │
              └─────────────┘
```

## 📁 Project Structure

- **backend/** - Core trading engine and services
- **frontend/** - React monitoring dashboard
- **ml_models/** - Machine learning models for predictions
- **docs/** - Documentation and design documents
- **scripts/** - Utility and deployment scripts
- **tests/** - Test suites

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- PostgreSQL 14+
- Redis 6+

### Backend Setup
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Add your API keys to .env
python manage.py migrate
python manage.py runserver
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

## 🔑 Key Features

- **Multi-Platform Support**: Abstract interface for different prediction markets
- **Real-Time Trading**: WebSocket connections for live market data
- **Risk Management**: Position limits, drawdown protection, circuit breakers
- **Backtesting**: Historical data analysis and strategy testing
- **Monitoring**: Real-time dashboard with performance metrics
- **Audit Trail**: Complete logging of all trading activities

## 👥 Team

- **Bob** - Senior Backend Engineer (Architecture)
- **Sara** - Junior Backend Developer
- **Judy** - Senior Web Developer
- **Artemis** - Junior Web Developer
- **Molly** - Product Manager
- **Sam** - Quality Engineer
- **Fred** - Designer
- **Christina** - Engineering Manager

## 📋 Development Process

We follow an agile development process with:
- Weekly sprints
- Daily standups in #daily-standup
- Code reviews for all PRs
- Comprehensive testing requirements

## 🔒 Security

- API keys stored securely (never in code)
- All connections use HTTPS/WSS
- Rate limiting and circuit breakers
- Comprehensive audit logging

## 📊 Current Status

🟡 **Phase: Initial Development**

See [GitHub Issues](https://github.com/manu-labs/agent-team-workspace/issues) for current tasks.

## 📝 License

Private repository - All rights reserved
