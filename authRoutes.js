// src/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const {
  sendEmailOtp,
  verifyEmailOtp,
  sendSmsOtp,
  verifySmsOtp
} = require('../controllers/authController');

router.post('/send-email-otp', sendEmailOtp);
router.post('/verify-email-otp', verifyEmailOtp);
router.post('/send-sms-otp', sendSmsOtp);
router.post('/verify-sms-otp', verifySmsOtp);

module.exports = router;