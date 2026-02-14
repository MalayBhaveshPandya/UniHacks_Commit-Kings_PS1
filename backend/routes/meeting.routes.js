const express = require('express');
const router = express.Router();
const vaultController = require('../controllers/vault.controller');

// GET all meetings
router.get('/', vaultController.getMeetings);

// Create meeting
router.post('/', vaultController.createMeeting);

// GET single meeting
router.get('/:id', vaultController.getMeeting);

// DELETE meeting
router.delete('/:id', vaultController.deleteMeeting);

// Toggle insight
router.post('/:id/transcript/:index/insight', vaultController.toggleTranscriptInsight);

module.exports = router;
