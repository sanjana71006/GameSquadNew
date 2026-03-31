const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const GameStat = require('../models/GameStat');
const User = require('../models/User');

// Get overall analytics for user
router.get('/', auth, async (req, res) => {
  try {
    const stats = await GameStat.find({ userId: req.user.id });
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const progress = Object.fromEntries(user.progress.entries());

    // Calculate aggregated data
    let totalGames = stats.length;
    let wins = stats.filter(s => s.result === 'win').length;
    let losses = totalGames - wins;
    let winRatio = totalGames > 0 ? (wins / totalGames) * 100 : 0;
    
    // Average accuracy
    let totalAccuracy = stats.reduce((acc, s) => acc + (s.accuracy || 0), 0);
    let avgAccuracy = totalGames > 0 ? totalAccuracy / totalGames : 0;

    // Average time
    let totalTime = stats.reduce((acc, s) => acc + s.timeToComplete, 0);
    let avgTime = totalGames > 0 ? totalTime / totalGames : 0;

    // Group by game
    const gameBreakdown = {};
    const knownGameIds = [
      'memory-grid',
      'arithmetic-speed',
      'number-series',
      'logic-decision',
      'crunch-match',
      'key-quest',
      'n-queen-puzzle'
    ];
    const gameIds = knownGameIds;
    
    gameIds.forEach(id => {
        const gameStats = stats.filter(s => s.gameId === id);
        gameBreakdown[id] = {
            played: gameStats.length,
            wins: gameStats.filter(s => s.result === 'win').length,
            avgScore: gameStats.length > 0 ? gameStats.reduce((acc, s) => acc + s.score, 0) / gameStats.length : 0
        };
    });

    res.json({
      totalGames,
      wins,
      losses,
      winRatio,
      avgAccuracy,
      avgTime,
      gameBreakdown,
      progress // to construct the roadmap
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
