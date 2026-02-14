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
    recordingUrl: { // Changed from recordingLink to match frontend
        type: String,
        default: ""
    },
    duration: {
        type: String,
        default: ""
    },
    transcript: {
        type: mongoose.Schema.Types.Mixed, // Allow array of objects {time, speaker, text}
        default: []
    },
    tags: [{
        type: String
    }],
    participants: [{ // Can be ObjectIds if linked, or strings if just names
        type: mongoose.Schema.Types.Mixed // Start with Mixed to support both ID and String names
    }],
    insights: [{ // Indices of transcript lines marked as insight
        type: Number
    }]
});

module.exports = mongoose.model('Meeting', meetingSchema);
