// models/order.js
const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  buyerEmail: { type: String, required: true },
  noteTitle: { type: String, required: true },
  pdfUrl: { type: String, required: true },
  transactionId: { type: String },
  status: { type: String, enum: ['delivered', 'pending'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date }, // for expiring links
});

module.exports = mongoose.model('Order', orderSchema);
