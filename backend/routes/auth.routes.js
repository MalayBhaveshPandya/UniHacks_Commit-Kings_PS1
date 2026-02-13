const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");
const auth = require("../middlewares/auth");

// POST /api/auth/signup
router.post("/signup", authController.signup);

// POST /api/auth/login
router.post("/login", authController.login);

// GET /api/auth/me  (protected)
router.get("/me", auth, authController.me);

// PUT /api/auth/profile  (protected)
router.put("/profile", auth, authController.updateProfile);

module.exports = router;
