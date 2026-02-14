const mongoose = require('mongoose');

const meetingSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    scheduledAt: {
        type: Date,
        required: true,
        default: Date.now
    },
    recordingUrl: {
        type: String,
        default: ""
    },
    duration: {
        type: String,
        default: ""
    },
    transcript: {
        type: mongoose.Schema.Types.Mixed, // Array of {time, speaker, text}
        default: []
    },
    tags: [{
        type: String
    }],
    participants: [{
        type: mongoose.Schema.Types.Mixed
    }],
    insights: [{
        type: Number
    }],
    // --- New fields for live meetings ---
    roomId: {
        type: String,
        default: ""
    },
    isActive: {
        type: Boolean,
        default: false
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    // Audio transcription fields
    audioUrl: {
        type: String,
        default: ""
    },
    aiSummary: {
        type: String,
        default: ""
    }
});

module.exports = mongoose.model('Meeting', meetingSchema);
