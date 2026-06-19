const User = require('../models/User');
const exnessService = require('../services/exnessService');

// @desc    Connect Exness MetaTrader Account
// @route   POST /api/exness/connect
// @access  Private
const connectExness = async (req, res) => {
  try {
    const { accountId, password, server } = req.body;
    
    if (!accountId || !password || !server) {
      return res.status(400).json({ success: false, message: 'Please provide Account ID, Password, and Server' });
    }

    // Call the MetaApi Service to provision and connect the account
    const connectionResult = await exnessService.connectMetaApi(accountId, password, server);
    
    if (connectionResult.success) {
      // Save credentials to User model
      const user = req.user;
      user.exnessAccountId = accountId;
      user.exnessPassword = password;
      user.exnessServer = server;
      user.isExnessConnected = true;
      
      await user.save();

      return res.json({ success: true, message: 'Exness connected successfully via MetaApi' });
    } else {
      return res.status(400).json({ success: false, message: 'Failed to connect Exness' });
    }
  } catch (error) {
    console.error('[ExnessController] Error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to connect Exness' });
  }
};

// @desc    Disconnect Exness Account
// @route   POST /api/exness/disconnect
// @access  Private
const disconnectExness = async (req, res) => {
  try {
    const user = req.user;
    
    // Wipe Exness credentials
    user.exnessAccountId = null;
    user.exnessPassword = null;
    user.exnessServer = null;
    user.isExnessConnected = false;
    
    await user.save();

    res.json({ success: true, message: 'Exness broker disconnected securely.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to disconnect broker', error: error.message });
  }
};

// @desc    Get Exness Dashboard Metrics
// @route   GET /api/exness/dashboard
// @access  Private
const getExnessDashboard = async (req, res) => {
  try {
    const user = req.user;

    if (!user.isExnessConnected || !user.exnessAccountId) {
      return res.status(400).json({ success: false, message: 'Exness account is not connected.' });
    }

    // Fetch real-time data using the MetaApi service
    const accountDetails = await exnessService.fetchAccountDetails(user.exnessAccountId);

    res.json({
      success: true,
      data: {
        balance: accountDetails.balance,
        equity: accountDetails.equity,
        margin: accountDetails.margin,
        freeMargin: accountDetails.freeMargin,
        positions: accountDetails.positions || { openCount: 0, todaysPnl: 0, totalPnl: 0 }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch live Exness data', error: error.message });
  }
};

module.exports = { connectExness, disconnectExness, getExnessDashboard };
