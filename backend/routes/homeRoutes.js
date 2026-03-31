const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const GameTrend = require('../models/GameTrend');
const RecentPlay = require('../models/RecentPlay');
const GameStat = require('../models/GameStat');

const KNOWN_GAME_IDS = [
  'arithmetic-speed',
  'number-series',
  'logic-decision',
  'crunch-match',
  'key-quest',
  'n-queen-puzzle',
  'amazon-memory-match',
  'water-jug-problem',
  'tcs-career-ascent'
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

    // Build home analytics from actual gameplay history so existing data is reflected immediately.
    const [trending, recent] = await Promise.all([
      GameStat.aggregate([
        { $match: { gameId: { $in: KNOWN_GAME_IDS } } },
        {
          $group: {
            _id: '$gameId',
            totalPlays: { $sum: 1 },
            totalWins: { $sum: { $cond: [{ $eq: ['$result', 'win'] }, 1, 0] } },
            totalScore: { $sum: '$score' },
            lastPlayedAt: { $max: '$createdAt' }
          }
        },
        { $sort: { totalPlays: -1, lastPlayedAt: -1 } },
        { $limit: 5 },
        {
          $project: {
            _id: 0,
            gameId: '$_id',
            totalPlays: 1,
            totalWins: 1,
            totalScore: 1,
            lastPlayedAt: 1
          }
        }
      ]),
      GameStat.aggregate([
        { $match: { userId: user._id, gameId: { $in: KNOWN_GAME_IDS } } },
        {
          $group: {
            _id: '$gameId',
            lastPlayedAt: { $max: '$createdAt' },
            playCount: { $sum: 1 },
            bestScore: { $max: '$score' }
          }
        },
        { $sort: { lastPlayedAt: -1 } },
        { $limit: 5 },
        {
          $project: {
            _id: 0,
            gameId: '$_id',
            lastPlayedAt: 1,
            playCount: 1,
            bestScore: 1
          }
        }
      ])
    ]);

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
