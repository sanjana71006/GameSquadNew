const express = require('express');
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const User = require('../models/User');
const Notification = require('../models/Notification');

const router = express.Router();

const GAME_LABELS = {
  'crunch-match': 'Crunch - Mental Math',
  'arithmetic-speed': 'Arithmetic Speed',
  'number-series': 'Number Series',
  'logic-decision': 'Logic Decision',
  'key-quest': 'Key Quest',
  'n-queen-puzzle': 'N-Queen Puzzle',
  'missionaries-cannibals': 'Missionaries and Cannibals',
  'amazon-memory-match': 'Amazon Memory Match',
  'water-jug-problem': 'Water Jug Problem',
  'tcs-career-ascent': 'TCS Career Ascent'
};

const gameLabel = (gameId) => GAME_LABELS[gameId] || gameId;

const normalizeNotification = (doc) => {
  if (!doc) return null;

  const sender = doc.senderId && typeof doc.senderId === 'object'
    ? {
      id: String(doc.senderId._id || doc.senderId.id || ''),
      name: doc.senderId.name,
      email: doc.senderId.email
    }
    : { id: String(doc.senderId), name: undefined, email: undefined };

  const recipient = doc.recipientId && typeof doc.recipientId === 'object'
    ? {
      id: String(doc.recipientId._id || doc.recipientId.id || ''),
      name: doc.recipientId.name,
      email: doc.recipientId.email
    }
    : { id: String(doc.recipientId), name: undefined, email: undefined };

  return {
    id: String(doc._id),
    type: doc.type,
    gameId: doc.gameId,
    gameName: gameLabel(doc.gameId),
    status: doc.status,
    read: Boolean(doc.read),
    sender,
    recipient,
    relatedInvitationId: doc.relatedInvitationId ? String(doc.relatedInvitationId) : null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    respondedAt: doc.respondedAt
  };
};

router.get('/', auth, async (req, res) => {
  try {
    const rows = await Notification.find({ recipientId: req.user.id })
      .populate('senderId', 'name email')
      .populate('recipientId', 'name email')
      .sort({ createdAt: -1 })
      .limit(60);

    res.json({ notifications: rows.map(normalizeNotification) });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.post('/invite', auth, async (req, res) => {
  try {
    const friendUsername = String(req.body?.friendUsername || '').trim();
    const gameId = String(req.body?.gameId || 'crunch-match');

    if (!friendUsername) {
      return res.status(400).json({ message: 'Friend username is required' });
    }

    const inviter = await User.findById(req.user.id);
    if (!inviter) return res.status(404).json({ message: 'User not found' });

    const friend = await User.findOne({ name: new RegExp(`^${friendUsername.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') });
    if (!friend) {
      return res.status(404).json({ message: 'Friend user not found by that username' });
    }

    if (String(friend._id) === String(inviter._id)) {
      return res.status(400).json({ message: 'You cannot invite yourself' });
    }

    const areFriends = (inviter.friends || []).some((id) => String(id) === String(friend._id));
    if (!areFriends) {
      return res.status(403).json({ message: 'Invite is allowed only to friends in your list' });
    }

    const existingPending = await Notification.findOne({
      recipientId: friend._id,
      senderId: inviter._id,
      type: 'game-invite',
      gameId,
      status: 'pending'
    });

    if (existingPending) {
      return res.status(400).json({ message: `${friend.name} already has a pending invite from you for ${gameLabel(gameId)}.` });
    }

    const invite = await Notification.create({
      recipientId: friend._id,
      senderId: inviter._id,
      type: 'game-invite',
      gameId,
      status: 'pending',
      read: false
    });

    const fullInvite = await Notification.findById(invite._id)
      .populate('senderId', 'name email')
      .populate('recipientId', 'name email');

    const payload = normalizeNotification(fullInvite);
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${String(friend._id)}`).emit('notification:new', payload);
    }

    res.status(201).json({ message: 'Invite sent successfully', notification: payload });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.post('/:notificationId/respond', auth, async (req, res) => {
  try {
    const { notificationId } = req.params;
    const action = String(req.body?.action || '').toLowerCase();

    if (!['accept', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'Action must be accept or reject' });
    }

    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      return res.status(400).json({ message: 'Invalid notification id' });
    }

    const invite = await Notification.findOne({
      _id: notificationId,
      recipientId: req.user.id,
      type: 'game-invite'
    })
      .populate('senderId', 'name email')
      .populate('recipientId', 'name email');

    if (!invite) {
      return res.status(404).json({ message: 'Invitation not found' });
    }

    if (invite.status !== 'pending') {
      return res.status(400).json({ message: 'Invitation is already processed' });
    }

    const nextStatus = action === 'accept' ? 'accepted' : 'rejected';
    invite.status = nextStatus;
    invite.respondedAt = new Date();
    invite.read = true;
    await invite.save();

    const responderNote = await Notification.create({
      recipientId: invite.senderId._id,
      senderId: invite.recipientId._id,
      type: 'invite-response',
      gameId: invite.gameId,
      status: nextStatus,
      relatedInvitationId: invite._id,
      read: false,
      respondedAt: invite.respondedAt
    });

    const fullResponderNote = await Notification.findById(responderNote._id)
      .populate('senderId', 'name email')
      .populate('recipientId', 'name email');

    const updatedInvite = await Notification.findById(invite._id)
      .populate('senderId', 'name email')
      .populate('recipientId', 'name email');

    const updatedInvitePayload = normalizeNotification(updatedInvite);
    const responderPayload = normalizeNotification(fullResponderNote);

    const io = req.app.get('io');
    if (io) {
      io.to(`user:${String(invite.recipientId._id)}`).emit('notification:update', updatedInvitePayload);
      io.to(`user:${String(invite.senderId._id)}`).emit('notification:new', responderPayload);

      io.to(`user:${String(invite.senderId._id)}`).emit('invitation:response', {
        invitationId: String(invite._id),
        status: nextStatus,
        gameId: invite.gameId,
        gameName: gameLabel(invite.gameId),
        friendName: invite.recipientId.name,
        friendId: String(invite.recipientId._id),
        respondedAt: invite.respondedAt
      });

      io.to(`user:${String(invite.recipientId._id)}`).emit('invitation:response', {
        invitationId: String(invite._id),
        status: nextStatus,
        gameId: invite.gameId,
        gameName: gameLabel(invite.gameId),
        friendName: invite.senderId.name,
        friendId: String(invite.senderId._id),
        respondedAt: invite.respondedAt
      });
    }

    res.json({ message: `Invitation ${nextStatus}`, invitation: updatedInvitePayload, responseNotification: responderPayload });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.post('/:notificationId/read', auth, async (req, res) => {
  try {
    const { notificationId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      return res.status(400).json({ message: 'Invalid notification id' });
    }

    const row = await Notification.findOneAndUpdate(
      { _id: notificationId, recipientId: req.user.id },
      { $set: { read: true } },
      { new: true }
    )
      .populate('senderId', 'name email')
      .populate('recipientId', 'name email');

    if (!row) return res.status(404).json({ message: 'Notification not found' });

    const payload = normalizeNotification(row);
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${String(req.user.id)}`).emit('notification:update', payload);
    }

    res.json({ notification: payload });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;