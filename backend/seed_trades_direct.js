require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Trade = require('./models/Trade');

async function seedData() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected.');

    const user = await User.findOne();
    if (!user) {
      console.log('No user found! Exiting.');
      process.exit(1);
    }

    console.log(`Found user: ${user.email}. Clearing old trades data...`);
    await Trade.deleteMany({ user: user._id });

    const dummyTrades = [
      { user: user._id, symbol: 'RELIANCE', type: 'BUY', quantity: 10, entryPrice: 2750.25, currentPrice: 2765.80, pnl: 155.50, status: 'OPEN' },
      { user: user._id, symbol: 'INFY', type: 'SELL', quantity: 15, entryPrice: 1450.00, currentPrice: 1445.30, pnl: 70.50, status: 'OPEN' },
      { user: user._id, symbol: 'HDFCBANK', type: 'SELL', quantity: 25, entryPrice: 450.25, currentPrice: 452.80, pnl: -63.75, status: 'OPEN' },
      { user: user._id, symbol: 'TCS', type: 'BUY', quantity: 5, entryPrice: 3800.00, currentPrice: 3820.50, pnl: 102.50, status: 'CLOSED' },
      { user: user._id, symbol: 'ITC', type: 'BUY', quantity: 100, entryPrice: 410.50, currentPrice: 415.00, pnl: 450.00, status: 'OPEN' },
      { user: user._id, symbol: 'SBIN', type: 'SELL', quantity: 50, entryPrice: 750.00, currentPrice: 755.20, pnl: -260.00, status: 'CLOSED' },
      { user: user._id, symbol: 'ICICIBANK', type: 'BUY', quantity: 20, entryPrice: 1050.25, currentPrice: 1080.00, pnl: 595.00, status: 'OPEN' },
      { user: user._id, symbol: 'WIPRO', type: 'SELL', quantity: 40, entryPrice: 480.00, currentPrice: 475.00, pnl: 200.00, status: 'CLOSED' },
      { user: user._id, symbol: 'TATASTEEL', type: 'BUY', quantity: 200, entryPrice: 150.00, currentPrice: 152.40, pnl: 480.00, status: 'OPEN' },
      { user: user._id, symbol: 'BAJFINANCE', type: 'SELL', quantity: 10, entryPrice: 7200.00, currentPrice: 7150.00, pnl: 500.00, status: 'CLOSED' }
    ];

    await Trade.insertMany(dummyTrades);
    console.log(`Successfully seeded ${dummyTrades.length} Trades.`);
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
}

seedData();
