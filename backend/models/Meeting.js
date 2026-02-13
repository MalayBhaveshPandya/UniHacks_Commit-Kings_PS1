const mongoose = require('mongoose');

const meetingSchema = new mongoose.Schema({
    scheduledAt: {
        type: Date,
        required: true
    },
    recordingLink: {
        type: String,
        required: true
    },
    transcript: {
        type: String, // Or JSON if stored structured
        default: ""
    },
    tags: [{
        type: String
    }],
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }]
});

module.exports = mongoose.model('Meeting', meetingSchema);
