const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const GameTrend = require('../models/GameTrend');
const RecentPlay = require('../models/RecentPlay');

const KNOWN_GAME_IDS = [
  'memory-grid',
  'arithmetic-speed',
  'number-series',
  'logic-decision',
  'crunch-match',
  'key-quest',
  'n-queen-puzzle'
];

router.get('/insights', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).lean();
    if (!user) return res.status(404).json({ message: 'User not found' });

    await GameTrend.bulkWrite(
      KNOWN_GAME_IDS.map((gameId) => ({
        updateOne: {
          filter: { gameId },
          update: { $setOnInsert: { gameId } },
          upsert: true
        }
      }))
    );

    const trending = await GameTrend.find({ gameId: { $in: KNOWN_GAME_IDS } })
      .sort({ totalPlays: -1, lastPlayedAt: -1 })
      .limit(5)
      .lean();

    const recent = await RecentPlay.find({ userId: req.user.id, gameId: { $in: KNOWN_GAME_IDS } })
      .sort({ lastPlayedAt: -1 })
      .limit(5)
      .lean();

    res.json({
      agenda: {
        title: 'Why PuzzlePlay Arena Exists',
        points: [
          'Sharpen puzzle-solving speed and accuracy through progressive, level-based challenges.',
          'Build deeper logical thinking with pattern, memory, and decision-focused game modes.',
          'Encourage healthy competitiveness via rankings, personal records, and social play.'
        ]
      },
      trending,
      recent
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
