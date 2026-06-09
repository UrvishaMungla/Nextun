const mongoose = require('mongoose');

const tradeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    symbol: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['BUY', 'SELL'],
    },
    quantity: {
      type: Number,
      required: true,
    },
    entryPrice: {
      type: Number,
      required: true,
    },
    currentPrice: {
      type: Number,
      required: true,
    },
    pnl: {
      type: Number,
      required: true,
      default: 0,
    },
    status: {
      type: String,
      required: true,
      enum: ['OPEN', 'CLOSED'],
      default: 'OPEN',
    }
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Trade', tradeSchema);
