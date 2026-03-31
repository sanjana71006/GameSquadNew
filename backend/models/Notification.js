const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['game-invite', 'invite-response'],
    required: true
  },
  gameId: {
    type: String,
    required: true,
    default: 'crunch-match'
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending'
  },
  read: {
    type: Boolean,
    default: false,
    index: true
  },
  relatedInvitationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Notification',
    default: null
  },
  respondedAt: {
    type: Date,
    default: null
  }
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);