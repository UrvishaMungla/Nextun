# Nextun Trading Platform

Nextun is an advanced, automated trading platform dashboard built with Django. It features a modern, premium user interface and integrates sophisticated trading strategies for algorithmic backtesting and trade generation.

## Features

- **Double Top & Double Bottom Strategy**: Identifies classic reversal patterns on multiple timeframes and symbols (Forex, Crypto, Commodities) with automated entry, Stop Loss (SL), and Take Profit (TP) calculations.
- **Liquidity Trap Strategy**: An advanced "Smart Money Concept" (SMC) strategy that uses multi-timeframe analysis (e.g., 1H structure, 5M execution) to detect liquidity sweeps below major lows or above major highs.
- **Dynamic Market Hours & Holiday Filtering**: Uses real-world market hours and holiday schedules (Forex, Crypto, Indian Markets) to filter out false signals when the market is closed.
- **Comprehensive Backtesting Engine**: Powered by `yfinance`, processes historical OHLCV data to simulate real-world trading logic.
- **Interactive Dashboard**: A sleek, dark-themed UI to monitor active strategies, view detailed backtest metrics (win rate, total PnL), and analyze historical trades.

## Project Structure

```
Nextun-main/
│
├── api/                        # Backend APIs and Backtesting Engines
│   ├── strategy_backtest.py    # Double Top / Double Bottom logic
│   ├── liquidity_trap_backtest.py # Liquidity Trap & Inducement logic
│   ├── market_utils.py         # Dynamic market hours & holidays filter
│   ├── views.py                # API endpoints and route handlers
│   ├── models.py               # Database schemas (User, Strategy, Trades)
│   └── urls.py                 # API Routing
│
├── static/                     # Frontend Static Assets (CSS, JS)
│   ├── strategies.js           # Strategy selection & backtest invocation
│   ├── trades.js               # Dynamic rendering of trade history
│   └── main.css                # Global styles and modern dashboard UI
│
├── templates/                  # Django HTML Templates
│   ├── dashboard.html          # Main User Dashboard
│   ├── strategies.html         # Trading Strategies Interface
│   └── trades.html             # Historical Trades UI
│
├── nextun_project/             # Django Core Configuration
│   ├── settings.py             # Project settings, DB config, Auth
│   └── urls.py                 # Core routing
│
├── db.sqlite3                  # SQLite Database
├── manage.py                   # Django CLI Utility
└── requirements.txt            # Python Dependencies
```

## How to Clone and Run

Follow these steps to set up the project locally on your machine:

1. **Clone the repository**
   ```bash
   git clone https://github.com/UrvishaMungla/Nextun.git
   cd Nextun
   ```

2. **Create and activate a virtual environment (Optional but recommended)**
   ```bash
   python -m venv venv
   
   # Windows
   venv\Scripts\activate
   
   # Mac/Linux
   source venv/bin/activate
   ```

3. **Install the required dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Apply database migrations**
   ```bash
   python manage.py makemigrations
   python manage.py migrate
   ```

5. **Run the development server**
   ```bash
   python manage.py runserver
   ```

6. **Access the application**
   Open your web browser and go to `http://127.0.0.1:8000`
