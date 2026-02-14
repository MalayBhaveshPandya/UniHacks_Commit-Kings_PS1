const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  // 'team' (channel/group) or 'dm' (direct message)
  type: {
    type: String,
    enum: ['team', 'dm'],
    default: 'dm'
  },
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  admins: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  reviewers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  lastMessage: {
    text: String,
    createdAt: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Conversation', conversationSchema);
