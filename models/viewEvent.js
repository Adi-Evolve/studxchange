// models/viewEvent.js
const mongoose = require('mongoose');

const viewEventSchema = new mongoose.Schema({
  noteId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Notes' },
  userEmail: { type: String },
  eventType: { type: String, enum: ['view', 'download'], required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ViewEvent', viewEventSchema);
