const mongoose = require('mongoose');

const dailyPnlSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    date: {
      type: String, // Format: YYYY-MM-DD
      required: true,
    },
    pnl: {
      type: Number,
      required: true,
      default: 0,
    }
  },
  {
    timestamps: true,
  }
);

// Ensure a user only has one P&L entry per date
dailyPnlSchema.index({ user: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('DailyPnl', dailyPnlSchema);
