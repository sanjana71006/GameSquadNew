const mongoose = require('mongoose');

const gameTrendSchema = new mongoose.Schema({
  gameId: { type: String, required: true, unique: true },
  totalPlays: { type: Number, default: 0 },
  totalWins: { type: Number, default: 0 },
  totalScore: { type: Number, default: 0 },
  lastPlayedAt: { type: Date, default: Date.now }
}, { timestamps: true });

gameTrendSchema.index({ totalPlays: -1, lastPlayedAt: -1 });

module.exports = mongoose.model('GameTrend', gameTrendSchema);
