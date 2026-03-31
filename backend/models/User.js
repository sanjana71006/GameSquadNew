const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  progress: {
    type: Map,
    of: Number,
    default: {
      'arithmetic-speed': 1,
      'number-series': 1,
      'logic-decision': 1,
      'crunch-match': 1,
      'key-quest': 1,
      'n-queen-puzzle': 1,
      'missionaries-cannibals': 1,
      'amazon-memory-match': 1,
      'water-jug-problem': 1,
      'tcs-career-ascent': 1
    }
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
