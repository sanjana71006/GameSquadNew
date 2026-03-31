const mongoose = require('mongoose');

const recentPlaySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  gameId: { type: String, required: true },
  lastPlayedAt: { type: Date, default: Date.now },
  playCount: { type: Number, default: 1 },
  bestScore: { type: Number, default: 0 }
}, { timestamps: true });

recentPlaySchema.index({ userId: 1, gameId: 1 }, { unique: true });
recentPlaySchema.index({ userId: 1, lastPlayedAt: -1 });

module.exports = mongoose.model('RecentPlay', recentPlaySchema);
