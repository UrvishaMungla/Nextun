# 🚀 Nextun — AI-Powered Algorithmic Trading Platform

<div align="center">

**A full-stack Django-based algorithmic trading platform with real-time WebSocket data, broker integrations, strategy backtesting, and a premium dark-mode UI.**

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![Django](https://img.shields.io/badge/Django-6.0-092E20?style=for-the-badge&logo=django&logoColor=white)](https://djangoproject.com)
[![Django REST Framework](https://img.shields.io/badge/DRF-3.17-ff1709?style=for-the-badge&logo=django&logoColor=white)](https://www.django-rest-framework.org/)
[![Django Channels](https://img.shields.io/badge/Django_Channels-4.3-092E20?style=for-the-badge&logo=django&logoColor=white)](https://channels.readthedocs.io/)
[![JWT](https://img.shields.io/badge/JWT-Auth-000000?style=for-the-badge&logo=json-web-tokens&logoColor=white)](https://jwt.io/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://docker.com)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Project Architecture](#-project-architecture)
- [Tech Stack](#-tech-stack)
- [Database Models](#-database-models)
- [API Endpoints](#-api-endpoints)
- [Frontend Pages](#-frontend-pages)
- [Broker Integrations](#-broker-integrations)
- [Strategy Backtesting](#-strategy-backtesting)
- [Getting Started](#-getting-started)
- [Docker Deployment](#-docker-deployment)
- [Environment Variables](#-environment-variables)
- [Project Structure](#-project-structure)

---

## 🌟 Overview

**Nextun** is a sophisticated algorithmic trading platform that connects traders to multiple brokers (Angel One and Exness), provides real-time portfolio monitoring via WebSockets, and delivers AI-driven trading strategy management with historical backtesting capabilities.

The platform features:
- 🔐 **Secure JWT-based authentication** with 2FA support
- 📊 **Real-time dashboard** with live P&L tracking
- 🤖 **Strategy management** with automated backtesting engine
- 📈 **Multi-broker connectivity** (Angel One and Exness)
- 💬 **WebSocket live updates** via Django Channels + Daphne ASGI
- 🐳 **Docker-ready** for easy deployment

---

## ✨ Features

| Feature | Description |
|---|---|
| 🔑 User Authentication | Register / Login with JWT tokens, email-based auth |
| 📊 Live Dashboard | Real-time P&L, open trades, daily performance metrics |
| 📅 Monthly P&L Calendar | Visual calendar showing daily profit/loss data |
| 🤖 Strategy Engine | 4+ built-in strategies: Double Top/Bottom, EMA Crossover, RSI, MACD |
| 🔁 Backtesting | Historical strategy simulation with win-rate and drawdown analysis |
| 🏦 Angel One Broker | SmartAPI integration for Indian stock market trading |
| 💹 Exness Broker | Forex broker integration for currency pair trading |
| ⚙️ Settings Panel | Broker connection, notifications, 2FA, account management |
| 💰 Pricing Plans | Free / Pro / Enterprise plan management UI |
| 📱 Responsive UI | Premium dark-mode design, mobile-friendly |
| 🔔 Notifications | JSON-stored user notifications with toggle controls |
| 🌐 WebSocket | Live portfolio updates without page refresh |

---

## 🏗️ Project Architecture

\\\
+------------------------------------------------------------------+
|                        CLIENT BROWSER                            |
|   HTML Templates + Vanilla CSS + Vanilla JS (Fetch API)          |
|   Pages: index, dashboard, strategies, trades, settings,         |
|           pricing, signup                                         |
+------------------------------------------------------------------+
                       |  HTTP REST + WebSocket
                       v
+------------------------------------------------------------------+
|                   DAPHNE ASGI SERVER                             |
|              (Handles HTTP + WebSocket)                          |
+------------------------------------------------------------------+
            |                              |
            | HTTP                         | WebSocket (ws://)
            v                             v
+------------------------+   +----------------------------------+
|   DJANGO REST API      |   |     DJANGO CHANNELS              |
|                        |   |                                  |
|  /api/register/        |   |  ws://host/ws/portfolio/         |
|  /api/login/           |   |  PortfolioConsumer               |
|  /api/user/            |   |  (Real-time trade and P&L)       |
|  /api/trades/          |   +----------------------------------+
|  /api/strategies/      |
|  /api/backtest/        |
|  /api/broker/connect/  |
|  /api/settings/update/ |
+------------------------+
            |
            v
+------------------------------------------------------------------+
|                    DJANGO ORM LAYER                              |
|         Models: CustomUser, Strategy, Trade, DailyPnl            |
+------------------------------------------------------------------+
                            |
                            v
                 +---------------------+
                 |     SQLite DB        |
                 |   (dev / local)      |
                 |   db.sqlite3         |
                 +---------------------+

External Broker APIs:
  Angel One SmartAPI <---- api/views.py (AngelOneBrokerView)
  Exness REST API    <---- api/views.py (ExnessBrokerView)
\\\

---

## 🛠️ Tech Stack

### Backend

| Technology | Version | Purpose |
|---|---|---|
| Python | 3.11+ | Core language |
| Django | 6.0.6 | Web framework |
| Django REST Framework | 3.17.1 | RESTful API layer |
| Django Channels | 4.3.2 | WebSocket support |
| Daphne | 4.2.2 | ASGI server |
| SimpleJWT | 5.5.1 | JWT authentication |
| django-cors-headers | 4.9.0 | CORS policy management |
| Twisted | 26.4.0 | Async networking (Channels) |

### Frontend

| Technology | Purpose |
|---|---|
| HTML5 | Semantic page structure |
| Vanilla CSS | Custom dark-mode design system |
| Vanilla JavaScript | Dynamic fetch API calls, DOM manipulation |
| WebSocket API | Real-time live updates |

### DevOps

| Technology | Purpose |
|---|---|
| Docker | Containerization |
| docker-compose | Multi-service orchestration |
| SQLite | Development database |

---

## 🗄️ Database Models

### CustomUser (extends AbstractUser)

\\\python
email                 # Unique login identifier
angelOneClientCode    # Angel One broker client code
angelOneJwtToken      # Angel One session token
angelOneRefreshToken  # Angel One refresh token
isAngelOneConnected   # Broker connection flag
exnessAccountId       # Exness account ID
exnessPassword        # Encrypted broker password
exnessServer          # Exness server identifier
isExnessConnected     # Exness connection flag
activeStrategy        # FK -> Strategy
is2FAEnabled          # Two-factor auth toggle
notifications         # JSONField for user alerts
\\\

### Strategy

\\\python
name           # Strategy name (unique)
description    # Strategy description
minCapital     # Minimum required capital
successRate    # Historical success rate
riskReward     # Risk:Reward ratio
created_at / updated_at
\\\

### Trade

\\\python
user           # FK -> CustomUser
symbol         # Trading symbol (e.g., NIFTY, EURUSD)
type           # BUY | SELL
quantity       # Number of units
entryPrice     # Entry price
currentPrice   # Live current price
pnl            # Profit & Loss
status         # OPEN | CLOSED
created_at / updated_at
\\\

### DailyPnl

\\\python
user   # FK -> CustomUser
date   # YYYY-MM-DD format
pnl    # Float daily P&L value
\\\

---

## 🔌 API Endpoints

### Authentication

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | /api/register/ | Register new user | Public |
| POST | /api/login/ | Login and get JWT tokens | Public |
| POST | /api/token/refresh/ | Refresh JWT access token | Public |

### User

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | /api/user/ | Get current user profile | JWT |
| PUT/PATCH | /api/settings/update/ | Update user settings | JWT |

### Trades

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | /api/trades/ | List all user trades | JWT |
| POST | /api/trades/ | Create a new trade | JWT |
| GET | /api/trades/{id}/ | Get single trade | JWT |
| DELETE | /api/trades/{id}/ | Delete a trade | JWT |

### Strategies

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | /api/strategies/ | List available strategies | JWT |
| POST | /api/strategies/select/ | Select active strategy | JWT |
| POST | /api/backtest/ | Run strategy backtest | JWT |

### Broker

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | /api/broker/connect/ | Connect broker account | JWT |
| POST | /api/broker/disconnect/ | Disconnect broker | JWT |

### P&L

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | /api/daily-pnl/ | Get daily P&L history | JWT |
| POST | /api/daily-pnl/update/ | Update today's P&L | JWT |

### WebSocket

| Endpoint | Description |
|---|---|
| ws://host/ws/portfolio/ | Real-time portfolio updates |

---

## 🖥️ Frontend Pages

| Page | URL | Description |
|---|---|---|
| Landing | / | Marketing homepage with features and CTA |
| Sign Up / Login | /signup/ | User registration and login forms |
| Dashboard | /dashboard/ | Live P&L, open trades, monthly calendar |
| Strategies | /strategies/ | Browse and activate trading strategies |
| Trades | /trades/ | Full trade history with filters |
| Settings | /settings/ | Broker connections, 2FA, notifications |
| Pricing | /pricing/ | Plan comparison and subscription UI |

---

## 🏦 Broker Integrations

### Angel One (SmartAPI)
- Connects to India's Angel One SmartAPI
- Stores clientCode, jwtToken, and refreshToken per user
- Tracks connection state with isAngelOneConnected
- Supports Indian equity and derivatives markets

### Exness
- Integrates Exness Forex broker
- Stores accountId, password, and server credentials
- Tracks connection with isExnessConnected
- Supports Forex and CFD trading

---

## 🤖 Strategy Backtesting

The strategy_backtest.py engine simulates trading strategies on historical data.

### Supported Strategies

| Strategy | Logic |
|---|---|
| Double Top / Bottom | Detects M/W price formations for reversal trades |
| EMA Crossover | 9/21 EMA crossover signals |
| RSI Reversal | RSI overbought/oversold entries |
| MACD Divergence | MACD signal line cross strategy |

### Backtest Output
- Total trades count
- Win rate percentage
- Total P&L
- Max drawdown
- Sharpe ratio estimate

---

## 🚀 Getting Started

### Prerequisites
- Python 3.11+
- pip
- Git

### 1. Clone the Repository

\\\ash
git clone https://github.com/UrvishaMungla/Nextun.git
cd Nextun
\\\

### 2. Create Virtual Environment

\\\ash
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate
\\\

### 3. Install Dependencies

\\\ash
pip install -r requirements.txt
\\\

### 4. Apply Migrations

\\\ash
python manage.py migrate
\\\

### 5. Create Superuser (Optional)

\\\ash
python manage.py createsuperuser
\\\

### 6. Run Development Server

\\\ash
python manage.py runserver
\\\

Visit: http://127.0.0.1:8000/

---

## 🐳 Docker Deployment

\\\ash
# Build and start all services
docker-compose up --build

# Run in detached mode
docker-compose up -d

# Stop services
docker-compose down
\\\

---

## 🔧 Environment Variables

Create a .env file in the project root:

\\\env
# Django
SECRET_KEY=your-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# JWT Settings
JWT_ACCESS_TOKEN_LIFETIME_MINUTES=60
JWT_REFRESH_TOKEN_LIFETIME_DAYS=7

# Angel One API (optional)
ANGEL_ONE_API_KEY=your-angel-one-api-key

# Exness API (optional)
EXNESS_API_URL=https://api.exness.com
\\\

---

## 📁 Project Structure

\\\
Nextun/
|
+-- api/                          # Core Django app
|   +-- __init__.py
|   +-- admin.py                  # Django admin registration
|   +-- apps.py                   # App configuration
|   +-- consumers.py              # WebSocket consumer (Django Channels)
|   +-- models.py                 # Database models
|   +-- routing.py                # WebSocket URL routing
|   +-- serializers.py            # DRF serializers
|   +-- strategy_backtest.py      # Backtesting engine
|   +-- tests.py                  # Unit tests
|   +-- urls.py                   # API URL patterns
|   +-- views.py                  # API views and business logic
|   +-- migrations/               # Django DB migrations
|
+-- nextun_project/               # Django project settings
|   +-- asgi.py                   # ASGI config (Channels + Daphne)
|   +-- settings.py               # Django settings
|   +-- urls.py                   # Root URL configuration
|   +-- wsgi.py                   # WSGI fallback
|
+-- templates/                    # HTML templates
|   +-- index.html                # Landing page
|   +-- signup.html               # Auth page (register/login)
|   +-- dashboard.html            # Main trading dashboard
|   +-- strategies.html           # Strategy browser
|   +-- trades.html               # Trade history
|   +-- settings.html             # User settings and broker connect
|   +-- pricing.html              # Pricing plans
|
+-- static/                       # Static assets
|   +-- style.css                 # Global CSS (dark mode design system)
|   +-- dashboard.css             # Dashboard-specific styles
|   +-- app.js                    # Auth and signup JS
|   +-- dashboard.js              # Dashboard live data JS
|   +-- strategies.js             # Strategy management JS
|   +-- trades.js                 # Trades table JS
|   +-- settings.js               # Settings form JS
|   +-- pricing.js                # Pricing plan JS
|   +-- logo.png                  # Brand assets
|
+-- Dockerfile                    # Docker image definition
+-- docker-compose.yml            # Docker Compose services
+-- manage.py                     # Django management CLI
+-- requirements.txt              # Python dependencies
+-- .gitignore                    # Git ignore rules
+-- README.md                     # This file
\\\

---

## 👤 Author

**Urvisha Mungla**
- GitHub: [@UrvishaMungla](https://github.com/UrvishaMungla)
- Repository: [Nextun](https://github.com/UrvishaMungla/Nextun)

---

## 📄 License

This project is for educational and personal use. All rights reserved.

---

<div align="center">
  <strong>Built with love using Django, Django REST Framework and Django Channels</strong>
</div>
