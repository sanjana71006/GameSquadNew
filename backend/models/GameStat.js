const mongoose = require('mongoose');

const gameStatSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  gameId: { type: String, required: true }, // e.g. 'arrow-path', 'amazon-memory-match', etc.
  level: { type: Number, required: true }, // 1 to 5
  score: { type: Number, required: true },
  timeToComplete: { type: Number, required: true }, // in seconds
  result: { type: String, enum: ['win', 'loss'], required: true },
  accuracy: { type: Number, default: 0 }, // optional, depending on the game
  moves: { type: Number, default: 0 }, // optional, for puzzle tracking
}, { timestamps: true });

module.exports = mongoose.model('GameStat', gameStatSchema);
