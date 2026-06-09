require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const DailyPnl = require('./models/DailyPnl');

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

    console.log(`Found user: ${user.email}. Clearing old PnL data...`);
    await DailyPnl.deleteMany({ user: user._id });

    const records = [];
    // Generate dates for the last 45 days up to today
    for (let i = 45; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      
      // Skip weekends
      if (d.getDay() === 0 || d.getDay() === 6) continue;
      
      const dateStr = d.toISOString().split('T')[0];
      
      // Random P&L between -2000 and +4000
      // Bias towards profit (60% win rate)
      const isWin = Math.random() < 0.6;
      let pnl = 0;
      if (isWin) {
        pnl = Math.floor(Math.random() * 3000) + 500; // +500 to +3500
      } else {
        pnl = -Math.floor(Math.random() * 1500) - 500; // -500 to -2000
      }
      
      records.push({
        user: user._id,
        date: dateStr,
        pnl: pnl
      });
    }
    
    await DailyPnl.insertMany(records);
    console.log(`Successfully seeded ${records.length} P&L records ending today.`);
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
}

seedData();
