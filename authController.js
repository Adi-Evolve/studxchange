// src/controllers/authController.js
const twilioService = require('../services/twilioService');

exports.sendEmailOtp = async (req, res) => {
  // Your existing email OTP logic
};

exports.verifyEmailOtp = async (req, res) => {
  // Email verification logic
};

exports.sendSmsOtp = async (req, res) => {
  try {
    const { phone } = req.body;
    const result = await twilioService.sendSmsOtp(phone);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.verifySmsOtp = async (req, res) => {
  try {
    const { phone, otp } = req.body;
    const result = await twilioService.verifySmsOtp(phone, otp);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};