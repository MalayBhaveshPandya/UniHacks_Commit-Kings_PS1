const express = require("express");
const router = express.Router();
const postController = require("../controllers/post.controller");
const auth = require("../middlewares/auth");

// All post routes require authentication
router.use(auth);

// GET    /api/posts              — Filtered feed
router.get("/", postController.getPosts);

// POST   /api/posts              — Create post
router.post("/", postController.createPost);

// PUT    /api/posts/:id          — Edit post
router.put("/:id", postController.updatePost);

// DELETE /api/posts/:id          — Delete post
router.delete("/:id", postController.deletePost);

// POST   /api/posts/:id/react    — React to post
router.post("/:id/react", postController.reactToPost);

// POST   /api/posts/:id/comment  — Comment on post
router.post("/:id/comment", postController.commentOnPost);

// POST   /api/posts/:id/repost   — Repost
router.post("/:id/repost", postController.repost);

// POST   /api/posts/:id/insight  — Mark/unmark as insight
router.post("/:id/insight", postController.markInsight);

module.exports = router;
