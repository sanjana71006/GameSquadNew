const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');

router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('friends', 'name email');
    if (!user) return res.status(404).json({ message: 'User not found' });

    const friends = (user.friends || []).map((f) => ({
      id: f._id,
      name: f.name,
      email: f.email
    }));

    res.json({ friends });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.post('/add', auth, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const friend = await User.findOne({ email: email.toLowerCase().trim() });
    if (!friend) return res.status(404).json({ message: 'Friend user not found' });
    if (String(friend._id) === String(user._id)) return res.status(400).json({ message: 'Cannot add yourself' });

    const alreadyAdded = (user.friends || []).some((f) => String(f) === String(friend._id));
    if (alreadyAdded) return res.status(400).json({ message: 'Friend already added' });

    user.friends.push(friend._id);
    await user.save();

    const friendAlreadyAdded = (friend.friends || []).some((f) => String(f) === String(user._id));
    if (!friendAlreadyAdded) {
      friend.friends.push(user._id);
      await friend.save();
    }

    res.json({ message: 'Friend added successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.delete('/:friendId', auth, async (req, res) => {
  try {
    const { friendId } = req.params;

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.friends = (user.friends || []).filter((f) => String(f) !== String(friendId));
    await user.save();

    const friend = await User.findById(friendId);
    if (friend) {
      friend.friends = (friend.friends || []).filter((f) => String(f) !== String(user._id));
      await friend.save();
    }

    res.json({ message: 'Friend removed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
