const mongoose = require('mongoose');

const strategySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  description: {
    type: String,
    required: true
  },
  minCapital: {
    type: String,
    required: true
  },
  successRate: {
    type: String,
    required: true
  },
  riskReward: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

const Strategy = mongoose.model('Strategy', strategySchema);
module.exports = Strategy;
