const Trade = require('../models/Trade');

// @desc    Get all trades for the logged in user
// @route   GET /api/trades
// @access  Private
const getTrades = async (req, res) => {
  try {
    const trades = await Trade.find({ user: req.user._id }).sort({ createdAt: -1 });
    
    // Calculate Summary Metrics
    const totalTrades = trades.length;
    let winCount = 0;
    let totalPnl = 0;
    let totalWinAmount = 0;
    let totalLossAmount = 0;
    let lossCount = 0;

    trades.forEach(trade => {
      totalPnl += trade.pnl;
      if (trade.pnl > 0) {
        winCount++;
        totalWinAmount += trade.pnl;
      } else if (trade.pnl < 0) {
        lossCount++;
        totalLossAmount += Math.abs(trade.pnl);
      }
    });

    const winRate = totalTrades > 0 ? ((winCount / totalTrades) * 100).toFixed(1) : 0;
    const avgWin = winCount > 0 ? (totalWinAmount / winCount).toFixed(0) : 0;
    const avgLoss = lossCount > 0 ? (totalLossAmount / lossCount).toFixed(0) : 0;

    const metrics = {
      totalTrades,
      winRate: `${winRate}%`,
      totalPnl,
      avgWinLoss: `₹${avgWin} / ₹${avgLoss}`
    };

    res.json({ success: true, data: trades, metrics });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Seed demo trades
// @route   POST /api/trades/seed
// @access  Private
const seedTrades = async (req, res) => {
  try {
    await Trade.deleteMany({ user: req.user._id });

    const dummyTrades = [
      { user: req.user._id, symbol: 'RELIANCE', type: 'BUY', quantity: 10, entryPrice: 2750.25, currentPrice: 2765.80, pnl: 155.50, status: 'OPEN' },
      { user: req.user._id, symbol: 'INFY', type: 'SELL', quantity: 15, entryPrice: 1450.00, currentPrice: 1445.30, pnl: 70.50, status: 'OPEN' },
      { user: req.user._id, symbol: 'HDFCBANK', type: 'SELL', quantity: 25, entryPrice: 450.25, currentPrice: 452.80, pnl: -63.75, status: 'OPEN' },
      { user: req.user._id, symbol: 'TCS', type: 'BUY', quantity: 5, entryPrice: 3800.00, currentPrice: 3820.50, pnl: 102.50, status: 'CLOSED' },
      { user: req.user._id, symbol: 'ITC', type: 'BUY', quantity: 100, entryPrice: 410.50, currentPrice: 415.00, pnl: 450.00, status: 'OPEN' },
      { user: req.user._id, symbol: 'SBIN', type: 'SELL', quantity: 50, entryPrice: 750.00, currentPrice: 755.20, pnl: -260.00, status: 'CLOSED' },
      { user: req.user._id, symbol: 'ICICIBANK', type: 'BUY', quantity: 20, entryPrice: 1050.25, currentPrice: 1080.00, pnl: 595.00, status: 'OPEN' },
      { user: req.user._id, symbol: 'WIPRO', type: 'SELL', quantity: 40, entryPrice: 480.00, currentPrice: 475.00, pnl: 200.00, status: 'CLOSED' },
    ];

    await Trade.insertMany(dummyTrades);
    res.json({ success: true, message: 'Demo trades seeded successfully!' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

module.exports = { getTrades, seedTrades };
