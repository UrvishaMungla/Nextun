const express = require('express');
const router = express.Router();
const Strategy = require('../models/Strategy');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

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

// @route   GET /api/strategies
// @desc    Get all available strategies and user's active strategy
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const strategies = await Strategy.find({});
    
    res.json({
      success: true,
      data: {
        strategies,
        activeStrategy: req.user.activeStrategy
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/strategies/toggle
// @desc    Toggle a strategy on or off
// @access  Private
router.post('/toggle', protect, async (req, res) => {
  try {
    const { strategyId } = req.body;
    
    // If the strategyId matches the user's active strategy, turn it off
    if (req.user.activeStrategy && req.user.activeStrategy.toString() === strategyId) {
      req.user.activeStrategy = null;
    } else {
      // Otherwise, turn it on
      req.user.activeStrategy = strategyId;
    }
    
    await req.user.save();
    
    res.json({
      success: true,
      data: {
        activeStrategy: req.user.activeStrategy
      },
      message: 'Strategy updated successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/strategies/seed
// @desc    Seed initial dummy strategies
// @access  Public
router.post('/seed', async (req, res) => {
  try {
    await Strategy.deleteMany({});
    
    const strategiesToInsert = [
      {
        name: "Deviation Strategy",
        description: "Works with different moving averages to find optimal buy and sell zones",
        minCapital: "₹25,000.00",
        successRate: "70%",
        riskReward: "1:2"
      },
      {
        name: "Momentum Breakout",
        description: "Capitalizes on sudden volume spikes breaking through resistance levels",
        minCapital: "₹50,000.00",
        successRate: "65%",
        riskReward: "1:3"
      },
      {
        name: "Mean Reversion",
        description: "Fades extreme price movements anticipating a return to historical averages",
        minCapital: "₹40,000.00",
        successRate: "75%",
        riskReward: "1:1.5"
      }
    ];

    await Strategy.insertMany(strategiesToInsert);
    
    res.json({ success: true, message: 'Strategies seeded successfully!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
