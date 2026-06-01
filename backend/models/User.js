const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  angelOneClientCode: {
    type: String,
    default: null,
  },
  angelOneJwtToken: {
    type: String,
    default: null,
  },
  angelOneRefreshToken: {
    type: String,
    default: null,
  },
  isAngelOneConnected: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true
});

// Hash password before saving to the database
userSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method to match entered password with hashed password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);
module.exports = User;
