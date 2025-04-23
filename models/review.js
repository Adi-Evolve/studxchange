// models/review.js
const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  noteId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Notes' },
  userEmail: { type: String, required: true },
  rating: { type: Number, min: 1, max: 5, required: true },
  comment: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Review', reviewSchema);
