const mongoose = require("mongoose");

// --------------- Comment sub-schema ---------------
const commentSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        text: {
            type: String,
            required: [true, "Comment text is required"],
            trim: true,
        },
        anonymous: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

// --------------- Reaction sub-schema ---------------
const reactionSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        emoji: {
            type: String,
            required: true,
            trim: true,
        },
    },
    { timestamps: true }
);

// --------------- Post schema ---------------
const postSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        content: {
            type: String,
            required: [true, "Post content is required"],
            trim: true,
        },
        type: {
            type: String,
            enum: ["Reflection", "Update", "Decision", "Meeting"],
            default: "Update",
        },
        anonymous: {
            type: Boolean,
            default: false,
        },
        aiToggle: {
            type: Boolean,
            default: false,
        },
        reactions: [reactionSchema],
        comments: [commentSchema],
        reposts: [
            {
                user: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "User",
                },
                createdAt: {
                    type: Date,
                    default: Date.now,
                },
            },
        ],
        // Original post reference (for reposts)
        originalPost: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Post",
            default: null,
        },
        // Insight marking
        isInsight: {
            type: Boolean,
            default: false,
        },
        insightMarkedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        tags: [{ type: String, trim: true }],
    },
    { timestamps: true }
);

// --------------- Text index for keyword search ---------------
postSchema.index({ content: "text", tags: "text" });

module.exports = mongoose.model("Post", postSchema);
