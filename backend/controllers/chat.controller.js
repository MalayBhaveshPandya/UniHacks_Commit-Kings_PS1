const Message = require('../models/Message');
const aiService = require('../services/ai.service');
const crypto = require('crypto');

// Simple encryption setup
const ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32); // Ensure this is 32 bytes in prod
const IV_LENGTH = 16;

function encrypt(text) {
    let iv = crypto.randomBytes(IV_LENGTH);
    let cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

// Decrypt function (if needed for admin viewing later)
function decrypt(text) {
    let textParts = text.split(':');
    let iv = Buffer.from(textParts.shift(), 'hex');
    let encryptedText = Buffer.from(textParts.join(':'), 'hex');
    let decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}

// Get chat history for a channel or DM
exports.getMessages = async (req, res) => {
    try {
        const { channelId, receiverId } = req.query;
        let query = {};

        if (channelId) {
            query.channelId = channelId;
        } else if (receiverId) {
            // For DMs, we need messages where (sender is me AND receiver is them) OR (sender is them AND receiver is me)
            query = {
                $or: [
                    { senderId: req.user.id, receiverId: receiverId },
                    { senderId: receiverId, receiverId: req.user.id }
                ]
            };
        } else {
            return res.status(400).json({ message: "channelId or receiverId query parameter required" });
        }

        const messages = await Message.find(query)
            .sort({ timestamp: 1 })
            .populate('senderId', 'username'); // Populate username, but remember anonymous masking in model

        res.json(messages);
    } catch (error) {
        console.error("Error fetching messages:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Save a new message (This might be called via HTTP or strictly Socket.io depending on architecture. 
// Standard practice: Socket.io handles real-time, but HTTP endpoint as fallback/utility)
exports.saveMessage = async (req, res) => {
    try {
        const { receiverId, channelId, content, isAnonymous } = req.body;

        let senderId = req.user.id;
        let encryptedSenderId = null;

        if (isAnonymous) {
            encryptedSenderId = encrypt(req.user.id.toString());
            // We keep senderId as null or a system ID in DB for anonymity, 
            // but we might want to keep the real ID if the requirement was "Encrypted senderId field" AND "senderId field if isAnonymous is true" - wait, the schema change made senderId optional.
            // Requirement: "Encrypted senderId field if isAnonymous is true."
            // We will set senderId to null to ensure it's not queryable easily, and store encrypted.
            senderId = null;
        }

        const newMessage = new Message({
            senderId,
            encryptedSenderId,
            receiverId,
            channelId,
            content,
            isAnonymous
        });

        const savedMessage = await newMessage.save();

        // Only populate senderId if it exists (not anonymous)
        if (savedMessage.senderId) {
            await savedMessage.populate('senderId', 'username');
        }

        res.status(201).json(savedMessage);
    } catch (error) {
        console.error("Error saving message:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Get AI feedback on a draft
exports.getAIFeedback = async (req, res) => {
    try {
        const { content, persona } = req.body;
        if (!content) return res.status(400).json({ message: "Content is required" });

        const feedback = await aiService.generateTextFeedback(content, persona || 'Team Lead');
        res.json({ feedback });
    } catch (error) {
        console.error("Error generating AI feedback:", error);
        res.status(500).json({ message: "AI Service error" });
    }
};
