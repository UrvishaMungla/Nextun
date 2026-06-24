# 🚀 Nextun — AI-Powered Trading Platform

[![Django](https://img.shields.io/badge/Django-6.0.6-092E20?style=for-the-badge&logo=django&logoColor=white)](https://www.djangoproject.com/)
[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![DRF](https://img.shields.io/badge/DRF-3.17.1-red?style=for-the-badge)](https://www.django-rest-framework.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://docker.com)

> **Nextun** is a full-stack algorithmic trading platform built with Django REST Framework. It features a real-time trading dashboard, Double Top/Bottom pattern backtesting engine, multi-broker integration (Angel One & Exness/MT5), JWT authentication, WebSocket live feeds, and a PnL calendar — all served from a single Django backend.

---

## 📋 Table of Contents

- [✨ Features](#-features)
- [🏗️ Architecture](#️-architecture)
- [📁 Project Structure](#-project-structure)
- [🛠️ Tech Stack](#️-tech-stack)
- [⚙️ How the Backend Works](#️-how-the-backend-works)
- [📊 How the Dashboard Works](#-how-the-dashboard-works)
- [🧠 Strategy & Backtest Engine](#-strategy--backtest-engine)
- [🚀 How to Run Locally](#-how-to-run-locally)
- [🐳 Run with Docker](#-run-with-docker)
- [📡 API Endpoints](#-api-endpoints)
- [🌍 How to Clone](#-how-to-clone)
- [🤝 Contributing](#-contributing)

---

## ✨ Features

| Feature | Description |
|---|---|
| 🔐 **JWT Authentication** | Secure register/login with access & refresh tokens |
| 📊 **Live Dashboard** | Real-time P&L, trade metrics, and broker account overview |
| 🧠 **Backtest Engine** | Double Top / Double Bottom pattern scanner on any forex/stock symbol |
| 📅 **PnL Calendar** | Daily profit/loss calendar view for performance tracking |
| 📈 **Trades Journal** | Full trade history with filter (WIN/LOSS/ALL) and sort options |
| 🤝 **Angel One Integration** | Connect Indian broker Angel One for live trading |
| 💱 **Exness / MT5 Integration** | Connect Exness MT5 forex broker |
| 🔴 **WebSocket Live Feed** | Real-time price updates via Django Channels |
| ⚙️ **User Settings** | Profile, 2FA toggle, notification preferences |
| 💰 **Pricing Page** | Subscription plan selection |
| 🐳 **Docker Support** | One-command deployment via Docker Compose |

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                         CLIENT (Browser)                             │
│   index.html | dashboard.html | strategies.html | trades.html ...   │
│                    Vanilla JS + Fetch API + WebSocket                │
└────────────────────────────┬─────────────────────────────────────────┘
                             │  HTTP / WebSocket
                             ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    Django + Daphne ASGI Server                       │
│  ┌─────────────────────┐    ┌──────────────────────────────────────┐ │
│  │   REST API (DRF)    │    │  WebSocket (Django Channels)         │ │
│  │  /api/auth/...      │    │  ws://host/ws/prices/                │ │
│  │  /api/trades/       │    │  consumers.py → real-time feed       │ │
│  │  /api/strategies/   │    └──────────────────────────────────────┘ │
│  │  /api/pnl/calendar  │                                             │
│  │  /api/strategy/     │    ┌──────────────────────────────────────┐ │
│  │    backtest         │    │   Strategy Backtest Engine           │ │
│  └─────────────────────┘    │  strategy_backtest.py                │ │
│                             │  yfinance → pattern scan → results   │ │
│                             └──────────────────────────────────────┘ │
└──────────────────┬───────────────────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      SQLite / PostgreSQL                             │
│  CustomUser | Strategy | Trade | DailyPnl                           │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
Nextun/
├── api/                          # Main Django app
│   ├── models.py                 # DB models: CustomUser, Strategy, Trade, DailyPnl
│   ├── views.py                  # REST API views (Auth, Trades, Strategies, etc.)
│   ├── urls.py                   # URL routing for /api/*
│   ├── serializers.py            # DRF serializers
│   ├── consumers.py              # WebSocket consumer (real-time prices)
│   ├── routing.py                # WebSocket URL routing
│   ├── strategy_backtest.py      # Double Top/Bottom backtest engine
│   ├── admin.py                  # Django admin config
│   └── migrations/               # Database migrations
│
├── nextun_project/               # Django project config
│   ├── settings.py               # Settings (DB, auth, CORS, channels)
│   ├── urls.py                   # Root URL config
│   ├── asgi.py                   # ASGI config (HTTP + WebSocket)
│   └── wsgi.py                   # WSGI config
│
├── templates/                    # Frontend HTML pages
│   ├── index.html                # Landing page
│   ├── dashboard.html            # Trading dashboard
│   ├── strategies.html           # Strategy selection & backtest
│   ├── trades.html               # Trade journal
│   ├── settings.html             # User settings
│   ├── signup.html               # Register/Login page
│   └── pricing.html              # Subscription plans
│
├── static/                       # Static files (CSS, JS, images)
├── manage.py                     # Django management CLI
├── requirements.txt              # Python dependencies
├── Dockerfile                    # Docker image config
├── docker-compose.yml            # Docker Compose setup
└── .gitignore                    # Git ignore rules
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Backend Framework** | Django 6.0.6 |
| **REST API** | Django REST Framework 3.17.1 |
| **Authentication** | JWT via djangorestframework-simplejwt |
| **Real-time** | Django Channels 4.3.2 + Daphne ASGI |
| **Database** | SQLite (dev) / PostgreSQL (prod) |
| **Market Data** | yfinance (Yahoo Finance) |
| **Data Processing** | pandas, numpy |
| **CORS** | django-cors-headers |
| **Frontend** | Vanilla HTML/CSS/JavaScript |
| **Containerization** | Docker + Docker Compose |

---

## ⚙️ How the Backend Works

The backend is a **Django ASGI application** served by **Daphne**, supporting both HTTP REST and WebSocket connections simultaneously.

### Authentication Flow
1. User calls `POST /api/auth/register` or `POST /api/auth/login`
2. Backend returns an **access token** (JWT) and a **refresh token**
3. Client stores the access token in `localStorage`
4. Every subsequent request includes `Authorization: Bearer <token>`
5. DRF's `IsAuthenticated` permission class validates the token
6. Token can be refreshed via `POST /api/auth/refresh`

### Data Models

| Model | Purpose |
|---|---|
| `CustomUser` | Extends Django's AbstractUser; stores broker credentials (Angel One, Exness), active strategy, 2FA flag |
| `Strategy` | Pre-seeded trading strategies with metadata (min capital, success rate, risk:reward) |
| `Trade` | Individual trade records (symbol, type, entry/exit price, P&L, status) |
| `DailyPnl` | Aggregated daily profit/loss per user, used for the calendar view |

---

## 📊 How the Dashboard Works

The **Dashboard** (`dashboard.html`) is a single-page interface that:

1. **On load** — reads the JWT from `localStorage` and calls the backend to fetch user profile, trades summary, PnL calendar data, and active strategy details.

2. **Broker Connection Panel** — lets users enter credentials for:
   - **Angel One** → stores `clientCode`, marks `isAngelOneConnected = True`
   - **Exness / MT5** → stores `accountId`, `server`, marks `isExnessConnected = True`

3. **Real-time Prices** — opens a WebSocket connection to `ws://host/ws/prices/`. The `consumers.py` `PriceConsumer` handles the live feed, updating prices in the UI without page refresh.

4. **PnL Calendar** — renders a color-coded calendar (green = profit day, red = loss day) using data from `/api/pnl/calendar`.

5. **Trade Metrics** — displays total P&L, win rate, and total number of trades pulled from `/api/trades`.

---

## 🧠 Strategy & Backtest Engine

The core intelligence lives in `api/strategy_backtest.py`.

### Pattern: Double Top / Double Bottom

The engine scans historical OHLCV data from **Yahoo Finance** to detect classic reversal patterns.

### Entry & Exit Rules

| Rule | Value |
|---|---|
| **Pattern Distance** | 10–60 candles between two peaks/troughs |
| **Price Similarity** | < 1.5% difference between the two peaks/troughs |
| **Entry** | Close of the neckline-break candle |
| **Stop Loss** | Above/below both pattern extremes + 0.2% buffer |
| **Take Profit 1 (TP1)** | Entry ± 1× Risk (close 50% of position) |
| **Take Profit 2 (TP2)** | Entry ± 2× Risk (close remaining 50%) |
| **After TP1** | SL moved to breakeven |
| **Noise Filter** | Risk must be ≥ 0.3× ATR(14) |

### Supported Timeframes

| Timeframe | History Available |
|---|---|
| 15m, 30m, 45m | 60 days |
| 1h, 2h, 4h | 730 days (2 years) |
| 1d | 5 years |

### Backtest Output Example

```json
{
  "symbol": "EURUSD=X",
  "timeframe": "1h",
  "total_trades": 42,
  "wins": 25,
  "partials": 8,
  "losses": 9,
  "win_rate": 78.57,
  "total_pnl": 0.15432,
  "daily_pnl": { "2025-01-01": 0.0023 },
  "trades": [...],
  "candles": [...]
}
```

---

## 🚀 How to Run Locally

### Prerequisites
- Python 3.10+
- Git

### Step 1 — Clone the Repository

```bash
git clone https://github.com/UrvishaMungla/Nextun.git
cd Nextun
```

### Step 2 — Create & Activate Virtual Environment

**Windows:**
```cmd
python -m venv venv
venv\Scripts\activate
```

**macOS / Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
```

### Step 3 — Install Dependencies

```bash
pip install -r requirements.txt
pip install yfinance pandas numpy
```

### Step 4 — Apply Database Migrations

```bash
python manage.py migrate
```

### Step 5 — (Optional) Create Admin User

```bash
python manage.py createsuperuser
```

### Step 6 — Run the Server

```bash
python manage.py runserver
```

| Page | URL |
|---|---|
| Landing Page | http://127.0.0.1:8000/ |
| Dashboard | http://127.0.0.1:8000/dashboard |
| Strategies | http://127.0.0.1:8000/strategies |
| Trades | http://127.0.0.1:8000/trades |
| Settings | http://127.0.0.1:8000/settings |
| API Root | http://127.0.0.1:8000/api/ |
| Admin Panel | http://127.0.0.1:8000/admin/ |

---

## 🐳 Run with Docker

```bash
# Build and start
docker-compose up --build

# Run in background
docker-compose up -d

# Stop
docker-compose down
```

App available at: **http://localhost:8000/**

---

## 📡 API Endpoints

### Auth
```
POST   /api/auth/register       Register a new user
POST   /api/auth/login          Login and receive JWT tokens
POST   /api/auth/refresh        Refresh access token
```

### User
```
GET    /api/user/settings       Get current user profile
PUT    /api/user/settings       Update profile / notification prefs
PUT    /api/user/password       Change password
```

### Strategies
```
GET    /api/strategies                List all available strategies
POST   /api/strategies/toggle         Activate or deactivate a strategy
POST   /api/strategy/backtest         Run backtest { symbol, timeframe }
```

### Trades
```
GET    /api/trades              Trade history
                                ?filter=ALL|WIN|LOSS
                                ?sort=DATE_DESC|DATE_ASC|PROFIT_DESC|LOSS_DESC
```

### PnL
```
GET    /api/pnl/calendar        Daily PnL records for calendar view
```

### Brokers
```
POST   /api/angelone/connect    Connect Angel One account
POST   /api/exness/connect      Connect Exness MT5 account
GET    /api/exness/dashboard    Get Exness account balance/margin data
POST   /api/exness/disconnect   Disconnect Exness account
```

### WebSocket
```
ws://host/ws/prices/            Real-time price feed via Django Channels
```

---

## 🌍 How to Clone

```bash
# Clone
git clone https://github.com/UrvishaMungla/Nextun.git

# Enter directory
cd Nextun

# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate
# Activate (macOS/Linux)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
pip install yfinance pandas numpy

# Migrate database
python manage.py migrate

# Run
python manage.py runserver

# Open browser at http://127.0.0.1:8000/
```

---

## 🤝 Contributing

1. Fork this repository
2. Create a new branch: `git checkout -b feature/your-feature-name`
3. Commit your changes: `git commit -m 'Add your feature'`
4. Push: `git push origin feature/your-feature-name`
5. Open a Pull Request

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

<p align="center">Made with ❤️ by <a href="https://github.com/UrvishaMungla">Urvisha Mungla</a></p>
