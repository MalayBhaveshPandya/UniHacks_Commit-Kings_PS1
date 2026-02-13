const express = require('express');
const router = express.Router();
const vaultController = require('../controllers/vault.controller');

router.post('/meetings', vaultController.createMeeting);
router.post('/insights', vaultController.markInsight);
router.get('/insights', vaultController.getInsights);

module.exports = router;
