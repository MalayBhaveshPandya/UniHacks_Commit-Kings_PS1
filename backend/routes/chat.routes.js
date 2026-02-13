const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chat.controller');
// Assume auth middleware is injected cleanly in server.js, 
// or import here if using a standard express pattern.
// For this task, we will assume `req.user` is populated by global middleware.

router.get('/messages', chatController.getMessages);
router.post('/messages', chatController.saveMessage);
router.post('/ai-feedback', chatController.getAIFeedback);

module.exports = router;
