const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const GameStat = require('../models/GameStat');
const User = require('../models/User');
const GameTrend = require('../models/GameTrend');
const RecentPlay = require('../models/RecentPlay');

// Save progress after game ends
router.post('/progress', auth, async (req, res) => {
  try {
    const { gameId, level, score, timeToComplete, result, accuracy, moves } = req.body;

    // Save stat
    const newStat = new GameStat({
      userId: req.user.id,
      gameId,
      level,
      score,
      timeToComplete,
      result,
      accuracy,
      moves
    });
    await newStat.save();

    // Update global game trend metrics for trending section.
    await GameTrend.findOneAndUpdate(
      { gameId },
      {
        $inc: {
          totalPlays: 1,
          totalWins: result === 'win' ? 1 : 0,
          totalScore: score || 0
        },
        $set: { lastPlayedAt: new Date() }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Track user-specific recent play history.
    const existingRecent = await RecentPlay.findOne({ userId: req.user.id, gameId });
    await RecentPlay.findOneAndUpdate(
      { userId: req.user.id, gameId },
      {
        $inc: { playCount: 1 },
        $set: {
          lastPlayedAt: new Date(),
          bestScore: Math.max(score || 0, existingRecent?.bestScore || 0)
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Update user's max level if they won and level unlocks the next one
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    let updatedLevel = false;
    // Current level config: max 5
    if (result === 'win' && level < 5) {
      const currentUnlocked = user.progress.get(gameId) || 1;
      // Unlock next level if they beat the current highest unlocked
      if (level === currentUnlocked) {
        user.progress.set(gameId, level + 1);
        await user.save();
        updatedLevel = true;
      }
    }

    const progressObj = Object.fromEntries(user.progress.entries());

    res.json({ message: 'Progress saved', updatedLevel, progress: progressObj });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Fetch user's stats for specific game
router.get('/:gameId/stats', auth, async (req, res) => {
  try {
    const stats = await GameStat.find({ userId: req.user.id, gameId: req.params.gameId }).sort({ createdAt: -1 });
    res.json(stats);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
