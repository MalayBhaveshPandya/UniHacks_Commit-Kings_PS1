const express = require('express');
const router = express.Router();
const vaultController = require('../controllers/vault.controller');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Ensure uploads directory exists
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir)
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, uniqueSuffix + path.extname(file.originalname))
  }
});
const upload = multer({ storage: storage });

// GET all meetings
router.get('/', vaultController.getMeetings);

// Create meeting (log/schedule)
router.post('/', vaultController.createMeeting);

// Start a live meeting (generates Jitsi room)
router.post('/start', vaultController.startMeeting);

// Transcribe audio
router.post('/transcribe', upload.single('audio'), vaultController.transcribeAudio);

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
