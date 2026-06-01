const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
let { SmartAPI } = require("smartapi-javascript");
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

// @route   POST /api/angelone/connect
// @desc    Connect to AngelOne using Client ID, PIN, and TOTP
// @access  Private
router.post('/connect', protect, async (req, res) => {
    const { clientId, pin, totp } = req.body;
    
    if (!process.env.ANGELONE_API_KEY) {
        return res.status(500).json({ 
            success: false, 
            message: 'AngelOne API key is not configured.' 
        });
    }

    try {
        let smart_api = new SmartAPI({
            api_key: process.env.ANGELONE_API_KEY,
        });

        // Authenticate with AngelOne
        const sessionData = await smart_api.generateSession(clientId, pin, totp);
        
        if (sessionData && sessionData.status) {
            // Success! Let's get the user's profile to confirm
            const profile = await smart_api.getProfile();
            
            // Save tokens to DB
            req.user.angelOneClientCode = clientId;
            req.user.angelOneJwtToken = sessionData.data.jwtToken;
            req.user.angelOneRefreshToken = sessionData.data.refreshToken;
            req.user.isAngelOneConnected = true;
            await req.user.save();
            
            res.json({
                success: true,
                message: 'Successfully connected to AngelOne!',
                data: {
                    status: 'connected',
                    clientId: clientId,
                    profile: profile.data
                }
            });
        } else {
            res.status(401).json({ 
                success: false, 
                message: sessionData.message || 'Authentication failed. Check credentials.' 
            });
        }
    } catch (error) {
        console.error('AngelOne connection error:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Failed to connect to broker.' 
        });
    }
});

// @route   GET /api/angelone/dashboard
// @desc    Fetch all live data for the dashboard
// @access  Private
router.get('/dashboard', protect, async (req, res) => {
    if (!req.user.isAngelOneConnected || !req.user.angelOneJwtToken) {
        return res.status(401).json({ success: false, message: 'Broker not connected yet.' });
    }

    try {
        // Instantiate from DB tokens
        let smart_api = new SmartAPI({
            api_key: process.env.ANGELONE_API_KEY,
        });
        
        smart_api.setAccessToken(req.user.angelOneJwtToken);
        smart_api.setPublicToken(req.user.angelOneRefreshToken);
        smart_api.setClientCode(req.user.angelOneClientCode);

        // Run fetches in parallel for speed
        const [rms, positions] = await Promise.all([
            smart_api.getRMS(),
            smart_api.getPosition()
        ]);

        let todaysPnl = 0;
        let totalPnl = 0;
        let openCount = 0;

        // Calculate PnL and active trades from positions
        if (positions && positions.data) {
            positions.data.forEach(p => {
                const m2m = parseFloat(p.m2m || 0);
                todaysPnl += m2m;
                totalPnl += m2m; // For a full total P&L, you'd merge holdings as well.
                
                if (parseInt(p.netqty || 0) !== 0) {
                    openCount++;
                }
            });
        }

        res.json({
            success: true,
            data: {
                rms: rms.data,
                positions: { todaysPnl, totalPnl, openCount }
            }
        });
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch dashboard data.' });
    }
});

module.exports = router;
