const express = require('express');
const router = express.Router();
const vaultController = require('../controllers/vault.controller');

// GET all meetings
router.get('/', vaultController.getMeetings);

// Create meeting (log/schedule)
router.post('/', vaultController.createMeeting);

// Start a live meeting (generates Jitsi room)
router.post('/start', vaultController.startMeeting);

// End a live meeting
router.post('/:id/end', vaultController.endMeeting);

// Update transcript
router.put('/:id/transcript', vaultController.updateTranscript);

// AI Summarize transcript
router.post('/:id/summarize', vaultController.summarizeTranscript);

// GET single meeting
router.get('/:id', vaultController.getMeeting);

// DELETE meeting
router.delete('/:id', vaultController.deleteMeeting);

// Toggle insight
router.post('/:id/transcript/:index/insight', vaultController.toggleTranscriptInsight);

module.exports = router;
