// src/services/twilioService.js
require('dotenv').config();
const twilio = require('twilio');
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const otpStore = new Map();

module.exports = {
  sendSmsOtp: async (phone) => {
    const otp = Math.floor(100000 + Math.random() * 900000);
    
    await client.messages.create({
      body: `Your verification code: ${otp}`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone
    });

    otpStore.set(phone, {
      otp,
      expires: Date.now() + 300000
    });

    return { success: true };
  },

  verifySmsOtp: (phone, userOtp) => {
    const stored = otpStore.get(phone);
    
    if (!stored || stored.otp !== parseInt(userOtp)) {
      throw new Error('Invalid OTP');
    }

    if (Date.now() > stored.expires) {
      throw new Error('OTP expired');
    }

    otpStore.delete(phone);
    return { success: true };
  }
};