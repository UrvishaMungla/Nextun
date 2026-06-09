const User = require('../models/User');
const bcrypt = require('bcryptjs');

// @desc    Get user settings
// @route   GET /api/user/settings
// @access  Private
const getUserSettings = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (user) {
      res.json({ success: true, data: user });
    } else {
      res.status(404).json({ success: false, message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Update user profile & settings
// @route   PUT /api/user/settings
// @access  Private
const updateUserSettings = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      user.username = req.body.username || user.username;
      user.email = req.body.email || user.email;
      
      if (req.body.is2FAEnabled !== undefined) {
        user.is2FAEnabled = req.body.is2FAEnabled;
      }
      
      if (req.body.notifications) {
        user.notifications = {
          ...user.notifications,
          ...req.body.notifications
        };
      }

      const updatedUser = await user.save();
      
      res.json({ 
        success: true, 
        message: 'Settings updated successfully',
        data: {
          username: updatedUser.username,
          email: updatedUser.email,
          is2FAEnabled: updatedUser.is2FAEnabled,
          notifications: updatedUser.notifications
        }
      });
    } else {
      res.status(404).json({ success: false, message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Update user password
// @route   PUT /api/user/password
// @access  Private
const updateUserPassword = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      // Check current password
      const isMatch = await user.matchPassword(req.body.currentPassword);
      if (!isMatch) {
        return res.status(400).json({ success: false, message: 'Incorrect current password' });
      }

      // Update password
      user.password = req.body.newPassword;
      await user.save();
      
      res.json({ success: true, message: 'Password updated successfully' });
    } else {
      res.status(404).json({ success: false, message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

module.exports = {
  getUserSettings,
  updateUserSettings,
  updateUserPassword
};
