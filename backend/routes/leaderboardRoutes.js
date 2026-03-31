const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const GameStat = require('../models/GameStat');
const User = require('../models/User');

const KNOWN_GAMES = [
  'arrow-path',
  'arithmetic-speed',
  'number-series',
  'logic-decision',
  'crunch-match',
  'key-quest',
  'n-queen-puzzle',
  'water-jug-problem',
  'tcs-career-ascent'
];

router.get('/', auth, async (_req, res) => {
  try {
    const overallAgg = await GameStat.aggregate([
      {
        $group: {
          _id: '$userId',
          totalScore: { $sum: '$score' },
          wins: { $sum: { $cond: [{ $eq: ['$result', 'win'] }, 1, 0] } },
          gamesPlayed: { $sum: 1 }
        }
      },
      { $sort: { totalScore: -1 } },
      { $limit: 20 }
    ]);

    const overallUserIds = overallAgg.map((x) => x._id);
    const overallUsers = await User.find({ _id: { $in: overallUserIds } }, 'name');
    const userNameMap = new Map(overallUsers.map((u) => [String(u._id), u.name]));

    const overall = overallAgg.map((row) => ({
      userId: String(row._id),
      name: userNameMap.get(String(row._id)) || 'Unknown',
      totalScore: row.totalScore,
      wins: row.wins,
      gamesPlayed: row.gamesPlayed
    }));

    const byGame = {};

    for (const gameId of KNOWN_GAMES) {
      const gameAgg = await GameStat.aggregate([
        { $match: { gameId } },
        {
          $group: {
            _id: '$userId',
            bestScore: { $max: '$score' },
            wins: { $sum: { $cond: [{ $eq: ['$result', 'win'] }, 1, 0] } }
          }
        },
        { $sort: { bestScore: -1, wins: -1 } },
        { $limit: 10 }
      ]);

      const ids = gameAgg.map((x) => x._id);
      const users = await User.find({ _id: { $in: ids } }, 'name');
      const gameUserMap = new Map(users.map((u) => [String(u._id), u.name]));

      byGame[gameId] = gameAgg.map((row) => ({
        userId: String(row._id),
        name: gameUserMap.get(String(row._id)) || 'Unknown',
        bestScore: row.bestScore,
        wins: row.wins
      }));
    }

    res.json({ overall, byGame });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
