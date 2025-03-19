// src/controllers/authController.js
const twilioService = require('../services/twilioService');
const axios = require('axios');
const OTP = require('../models/otp'); // Make sure you have the OTP model

exports.sendEmailOtp = async (req, res) => {
  try {
    const { email, name } = req.body;
    
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Save OTP to database
    await OTP.findOneAndDelete({ email }); // Delete any existing OTP
    await new OTP({ email, otp }).save();

    // Send email via EmailJS
    const emailjsResponse = await axios.post(
      'https://api.emailjs.com/api/v1.0/email/send',
      {
        service_id: process.env.EMAILJS_SERVICE_ID,
        template_id: process.env.EMAILJS_TEMPLATE_ID,
        user_id: process.env.EMAILJS_USER_ID,
        template_params: {
          to_email: email,
          to_name: name,
          otp: otp
        }
      }
    );

    if (emailjsResponse.status === 200) {
      res.json({ message: 'OTP sent successfully' });
    } else {
      throw new Error('Failed to send OTP via EmailJS');
    }
  } catch (error) {
    console.error('Email OTP error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to send OTP',
      details: error.response?.data
    });
  }
};

exports.verifyEmailOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    // Find OTP in database
    const otpRecord = await OTP.findOne({ email });
    
    if (!otpRecord) {
      return res.status(400).json({ error: 'OTP not found' });
    }

    // Check expiration (5 minutes)
    const createdAt = new Date(otpRecord.createdAt).getTime();
    const now = new Date().getTime();
    const diff = (now - createdAt) / 1000 / 60; // Difference in minutes

    if (diff > 5) {
      await OTP.findByIdAndDelete(otpRecord._id);
      return res.status(400).json({ error: 'OTP expired' });
    }

    if (otpRecord.otp !== otp) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    // Delete the OTP after successful verification
    await OTP.findByIdAndDelete(otpRecord._id);
    
    res.json({ verified: true });

  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to verify OTP',
      details: error.response?.data
    });
  }
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