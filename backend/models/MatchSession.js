const mongoose = require('mongoose');

const matchSessionSchema = new mongoose.Schema({
  gameId: {
    type: String,
    required: true,
    default: 'crunch-match',
    index: true
  },
  invitationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Notification',
    required: true,
    unique: true,
    index: true
  },
  players: {
    type: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    validate: {
      validator: (arr) => Array.isArray(arr) && arr.length === 2,
      message: 'Match session must have exactly 2 players'
    },
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['scheduled', 'active', 'completed', 'expired'],
    default: 'scheduled',
    index: true
  },
  startAt: {
    type: Date,
    required: true,
    index: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true
  }
}, { timestamps: true });

module.exports = mongoose.model('MatchSession', matchSessionSchema);
