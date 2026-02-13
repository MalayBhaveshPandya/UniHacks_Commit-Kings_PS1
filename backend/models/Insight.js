const mongoose = require('mongoose');

const insightSchema = new mongoose.Schema({
    sourceId: {
        type: mongoose.Schema.Types.ObjectId, // ID of Message or Post
        required: true
    },
    sourceType: {
        type: String,
        enum: ['Message', 'Post'],
        required: true
    },
    markedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    tags: [{
        type: String
    }],
    content: {
        type: String,
        required: true // Or optional if we allow empty insights
    },
    aiSummary: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Insight', insightSchema);
