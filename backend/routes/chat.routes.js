const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chat.controller');

// Users list (for member picker)
router.get('/users', chatController.getOrgUsers);

// Conversation endpoints
router.get('/conversations', chatController.getConversations);
router.post('/conversations', chatController.createConversation);
router.get('/conversations/:id', chatController.getConversationDetails);
router.put('/conversations/:id', chatController.updateConversation);
router.delete('/conversations/:id', chatController.deleteConversation);

// Group management
router.post('/conversations/:id/leave', chatController.leaveConversation);
router.post('/conversations/:id/participants', chatController.addParticipants);
router.delete('/conversations/:id/participants/:userId', chatController.removeParticipant);

// Reviewer management (admin only)
router.put('/conversations/:id/reviewers', chatController.manageReviewers);

// Insights
router.get('/conversations/:id/insights', chatController.getInsights);

// AI Summarize
router.post('/conversations/:id/summarize', chatController.summarizeChat);

// Message endpoints within conversations
router.get('/conversations/:id/messages', chatController.getMessages);
router.post('/conversations/:id/messages', chatController.sendMessage);

// Message actions
router.post('/messages/:id/insight', chatController.markMessageInsight);

// AI Feedback
router.post('/ai-feedback', chatController.getAIFeedback);

module.exports = router;
