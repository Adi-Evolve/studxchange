// models/paymentRequest.js
const mongoose = require('mongoose');

const paymentRequestSchema = new mongoose.Schema({
  email: { type: String, required: true },
  noteTitle: { type: String, required: true },
  pdfUrl: { type: String, required: true },
  transactionId: { type: String, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('PaymentRequest', paymentRequestSchema);
