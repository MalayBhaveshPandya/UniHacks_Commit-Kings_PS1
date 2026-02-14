const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    encryptedSenderId: {
        type: String, // Stores encrypted ID for anonymous messages
        default: null
    },
    conversationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Conversation'
    },
    receiverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    channelId: {  // Keeping for backward compatibility or direct channel string refs
        type: String,
        default: null
    },
    content: {
        type: String,
        default: ''
    },
    media: [{
        url: { type: String, required: true },
        publicId: { type: String },
        resourceType: { type: String, enum: ['image', 'video'], default: 'image' },
        width: Number,
        height: Number,
        format: String,
        duration: Number,
    }],
    isAnonymous: {
        type: Boolean,
        default: false
    },
    isInsight: {
        type: Boolean,
        default: false
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

// Helper method to "mask" sender if anonymous
messageSchema.methods.toJSON = function () {
    const obj = this.toObject();
    if (obj.isAnonymous) {
        obj.senderId = "ANONYMOUS";
        delete obj.encryptedSenderId; // Never expose the encrypted ID
    }
    return obj;
};

module.exports = mongoose.model('Message', messageSchema);
