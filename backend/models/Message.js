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
    receiverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    channelId: {
        type: String,
        default: null
    },
    content: {
        type: String,
        required: true
    },
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
