const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const DailyPnl = require('../models/DailyPnl');
const User = require('../models/User');

// Simple inline auth middleware
const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
      next();
    } catch (error) {
      console.error(error);
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  } else {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

// @route   GET /api/pnl/calendar
// @desc    Get all P&L records for the current user
router.get('/calendar', protect, async (req, res) => {
  try {
    const records = await DailyPnl.find({ user: req.user._id }).sort({ date: 1 });
    res.json({ success: true, data: records });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// @route   POST /api/pnl/seed
// @desc    Seed the database with random historical P&L for demo purposes
router.post('/seed', protect, async (req, res) => {
  try {
    // Clear existing for this user
    await DailyPnl.deleteMany({ user: req.user._id });
    
    const records = [];
    // Generate dates for the last 30 days
    for (let i = 30; i >= 0; i--) {
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
        user: req.user._id,
        date: dateStr,
        pnl: pnl
      });
    }
    
    await DailyPnl.insertMany(records);
    res.json({ success: true, message: 'Demo data seeded successfully!', count: records.length });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
});

module.exports = router;
