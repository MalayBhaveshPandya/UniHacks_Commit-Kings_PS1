const Post = require("../models/Post");

/**
 * GET /api/posts
 * Query: ?type=&keyword=&page=&insightsOnly=&tags=&search=
 * Returns: { posts, page, totalPages, total }
 */
exports.getPosts = async (req, res) => {
    try {
        const {
            type,
            keyword,
            page = 1,
            limit = 20,
            insightsOnly,
            tags,
            search,
        } = req.query;

        const filter = {};

        // Filter by post type
        if (type) filter.type = type;

        // Filter insights only (Knowledge Vault)
        if (insightsOnly === "true") filter.isInsight = true;

        // Filter by tags
        if (tags) {
            const tagList = tags.split(",").map((t) => t.trim());
            filter.tags = { $in: tagList };
        }

        // Keyword / search via text index
        const searchTerm = keyword || search;
        if (searchTerm) {
            filter.$text = { $search: searchTerm };
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const total = await Post.countDocuments(filter);
        const totalPages = Math.ceil(total / parseInt(limit));

        const posts = await Post.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .populate("user", "name email role jobTitle")
            .populate("comments.user", "name email")
            .populate("reactions.user", "name")
            .populate("reposts.user", "name")
            .populate("originalPost");

        // Strip user info from anonymous posts
        const sanitizedPosts = posts.map((post) => {
            const p = post.toObject();
            if (p.anonymous) {
                p.user = { _id: null, name: "Anonymous" };
            }
            // Strip user info from anonymous comments
            if (p.comments) {
                p.comments = p.comments.map((c) => {
                    if (c.anonymous) {
                        c.user = { _id: null, name: "Anonymous" };
                    }
                    return c;
                });
            }
            return p;
        });

        res.json({
            posts: sanitizedPosts,
            page: parseInt(page),
            totalPages,
            total,
        });
    } catch (err) {
        console.error("Get posts error:", err);
        res.status(500).json({ error: "Server error." });
    }
};

/**
 * POST /api/posts
 * Body: { content, type, anonymous, aiToggle, tags }
 * Returns: { post }
 */
exports.createPost = async (req, res) => {
    try {
        const { content, type, anonymous, aiToggle, tags } = req.body;

        if (!content) {
            return res.status(400).json({ error: "Post content is required." });
        }

        const post = await Post.create({
            user: req.user._id,
            content,
            type: type || "Update",
            anonymous: anonymous || false,
            aiToggle: aiToggle || false,
            tags: tags || [],
        });

        const populated = await post.populate("user", "name email role jobTitle");

        // Strip user if anonymous
        const result = populated.toObject();
        if (result.anonymous) {
            result.user = { _id: null, name: "Anonymous" };
        }

        res.status(201).json({ post: result });
    } catch (err) {
        if (err.name === "ValidationError") {
            const messages = Object.values(err.errors).map((e) => e.message);
            return res.status(400).json({ error: messages.join(", ") });
        }
        console.error("Create post error:", err);
        res.status(500).json({ error: "Server error." });
    }
};

/**
 * PUT /api/posts/:id
 * Body: { content, type, anonymous, aiToggle, tags }
 * Returns: { post }
 */
exports.updatePost = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ error: "Post not found." });
        }

        // Only the author can edit
        if (post.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: "Not authorized to edit this post." });
        }

        const { content, type, anonymous, aiToggle, tags } = req.body;
        if (content !== undefined) post.content = content;
        if (type !== undefined) post.type = type;
        if (anonymous !== undefined) post.anonymous = anonymous;
        if (aiToggle !== undefined) post.aiToggle = aiToggle;
        if (tags !== undefined) post.tags = tags;

        await post.save();
        await post.populate("user", "name email role jobTitle");

        const result = post.toObject();
        if (result.anonymous) {
            result.user = { _id: null, name: "Anonymous" };
        }

        res.json({ post: result });
    } catch (err) {
        console.error("Update post error:", err);
        res.status(500).json({ error: "Server error." });
    }
};

/**
 * DELETE /api/posts/:id
 * Returns: { message }
 */
exports.deletePost = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ error: "Post not found." });
        }

        // Only the author or Admin can delete
        if (
            post.user.toString() !== req.user._id.toString() &&
            req.user.role !== "Admin"
        ) {
            return res.status(403).json({ error: "Not authorized to delete this post." });
        }

        await Post.findByIdAndDelete(req.params.id);
        res.json({ message: "Post deleted successfully." });
    } catch (err) {
        console.error("Delete post error:", err);
        res.status(500).json({ error: "Server error." });
    }
};

/**
 * POST /api/posts/:id/react
 * Body: { emoji }
 * Returns: { post }
 */
exports.reactToPost = async (req, res) => {
    try {
        const { emoji } = req.body;
        if (!emoji) {
            return res.status(400).json({ error: "Emoji is required." });
        }

        const post = await Post.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ error: "Post not found." });
        }

        // Check if user already reacted with this emoji — toggle off
        const existingIndex = post.reactions.findIndex(
            (r) =>
                r.user.toString() === req.user._id.toString() &&
                r.emoji === emoji
        );

        if (existingIndex > -1) {
            // Remove reaction (toggle off)
            post.reactions.splice(existingIndex, 1);
        } else {
            // Add reaction
            post.reactions.push({ user: req.user._id, emoji });
        }

        await post.save();
        await post.populate("user", "name email role jobTitle");
        await post.populate("reactions.user", "name");

        res.json({ post });
    } catch (err) {
        console.error("React error:", err);
        res.status(500).json({ error: "Server error." });
    }
};

/**
 * POST /api/posts/:id/comment
 * Body: { text, anonymous }
 * Returns: { post }
 */
exports.commentOnPost = async (req, res) => {
    try {
        const { text, anonymous } = req.body;
        if (!text) {
            return res.status(400).json({ error: "Comment text is required." });
        }

        const post = await Post.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ error: "Post not found." });
        }

        post.comments.push({
            user: req.user._id,
            text,
            anonymous: anonymous || false,
        });

        await post.save();
        await post.populate("user", "name email role jobTitle");
        await post.populate("comments.user", "name email");

        // Sanitize anonymous data
        const result = post.toObject();
        if (result.anonymous) {
            result.user = { _id: null, name: "Anonymous" };
        }
        if (result.comments) {
            result.comments = result.comments.map((c) => {
                if (c.anonymous) {
                    c.user = { _id: null, name: "Anonymous" };
                }
                return c;
            });
        }

        res.status(201).json({ post: result });
    } catch (err) {
        console.error("Comment error:", err);
        res.status(500).json({ error: "Server error." });
    }
};

/**
 * POST /api/posts/:id/repost
 * Returns: { post } (the new repost)
 */
exports.repost = async (req, res) => {
    try {
        const originalPost = await Post.findById(req.params.id);
        if (!originalPost) {
            return res.status(404).json({ error: "Post not found." });
        }

        // Check if user already reposted
        const alreadyReposted = originalPost.reposts.some(
            (r) => r.user.toString() === req.user._id.toString()
        );
        if (alreadyReposted) {
            return res.status(400).json({ error: "You have already reposted this." });
        }

        // Track repost on original
        originalPost.reposts.push({ user: req.user._id });
        await originalPost.save();

        // Create a new post referencing the original
        const repost = await Post.create({
            user: req.user._id,
            content: originalPost.content,
            type: originalPost.type,
            originalPost: originalPost._id,
        });

        const populated = await repost.populate("user", "name email role jobTitle");
        await populated.populate("originalPost");

        res.status(201).json({ post: populated });
    } catch (err) {
        console.error("Repost error:", err);
        res.status(500).json({ error: "Server error." });
    }
};

/**
 * POST /api/posts/:id/insight
 * Toggle insight marking (Reviewer & Admin only)
 * Returns: { post }
 */
exports.markInsight = async (req, res) => {
    try {
        // Only Reviewer or Admin can mark insights
        if (req.user.role !== "Reviewer" && req.user.role !== "Admin") {
            return res.status(403).json({
                error: "Only Reviewers and Admins can mark insights.",
            });
        }

        const post = await Post.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ error: "Post not found." });
        }

        // Toggle
        post.isInsight = !post.isInsight;
        post.insightMarkedBy = post.isInsight ? req.user._id : null;

        await post.save();
        await post.populate("user", "name email role jobTitle");

        res.json({ post });
    } catch (err) {
        console.error("Mark insight error:", err);
        res.status(500).json({ error: "Server error." });
    }
};
