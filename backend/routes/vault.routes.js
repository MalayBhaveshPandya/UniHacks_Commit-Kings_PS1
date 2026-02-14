const express = require('express');
const router = express.Router();
const vaultController = require('../controllers/vault.controller');

// Meetings are now handled in meeting.routes.js

router.post('/insights', vaultController.markInsight);
router.get('/insights', vaultController.getInsights);

module.exports = router;
