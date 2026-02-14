const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const User = require('../models/User'); // Used for populate
const aiService = require('../services/ai.service');
const crypto = require('crypto');

// Encryption (same as before)
const ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32);
const IV_LENGTH = 16;

function encrypt(text) {
    let iv = crypto.randomBytes(IV_LENGTH);
    let cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

/**
 * GET /api/chat/conversations
 * Fetch all conversations for the user (DMs and Teams)
 */
exports.getConversations = async (req, res) => {
    try {
        // Find convs where user is participant OR it's a public team channel
        const conversations = await Conversation.find({
            $or: [
                { participants: req.user._id },
                { type: 'team' } // Assume all users can see team channels
            ]
        })
            .populate('participants', 'name email role')
            .sort({ 'lastMessage.createdAt': -1 });

        // Seed if empty (for demo purpose)
        if (conversations.length === 0) {
            const seedConvs = [
                { name: 'General', type: 'team', participants: [req.user._id] },
                { name: 'Engineering', type: 'team', participants: [req.user._id] },
                { name: 'Design', type: 'team', participants: [req.user._id] }
            ];
            await Conversation.insertMany(seedConvs);
            // Re-fetch
            const newConvs = await Conversation.find({ type: 'team' }).populate('participants', 'name email role');
            return res.json({ conversations: newConvs });
        }

        res.json({ conversations });
    } catch (error) {
        console.error("Get conversations error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

/**
 * GET /api/chat/conversations/:id/messages
 */
exports.getMessages = async (req, res) => {
    try {
        const { id } = req.params;
        const messages = await Message.find({ conversationId: id })
            .sort({ timestamp: 1 })
            .populate('senderId', 'name'); // Populate sender name

        // Map to frontend structure
        const mappedMessages = messages.map(msg => ({
            _id: msg._id,
            text: msg.content,
            createdAt: msg.timestamp,
            author: msg.senderId, // Populated user object
            anonymous: msg.isAnonymous,
            isInsight: msg.isInsight
        }));

        res.json({ messages: mappedMessages });
    } catch (error) {
        console.error("Get messages error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

/**
 * POST /api/chat/conversations
 * Create a new conversation (DM or Group)
 */
exports.createConversation = async (req, res) => {
    try {
        const { name, type, participantIds, description } = req.body;
        // Ensure creator is participant
        const allParticipants = [...new Set([...(participantIds || []), req.user._id.toString()])];

        const conv = await Conversation.create({
            name,
            description: description || '',
            type: type || 'dm',
            participants: allParticipants,
            createdBy: req.user._id,
            admins: [req.user._id], // Creator is first admin
        });

        const populated = await conv.populate('participants', 'name email role jobTitle');
        res.status(201).json({ conversation: populated });
    } catch (error) {
        console.error("Create conversation error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

/**
 * GET /api/chat/conversations/:id
 * Get conversation details (info panel)
 */
exports.getConversationDetails = async (req, res) => {
    try {
        const conv = await Conversation.findById(req.params.id)
            .populate('participants', 'name email role jobTitle')
            .populate('admins', 'name email role')
            .populate('reviewers', 'name email role')
            .populate('createdBy', 'name email');

        if (!conv) return res.status(404).json({ message: "Conversation not found" });
        res.json({ conversation: conv });
    } catch (error) {
        console.error("Get conversation details error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

/**
 * PUT /api/chat/conversations/:id
 * Update conversation (name, description)
 */
exports.updateConversation = async (req, res) => {
    try {
        const { name, description } = req.body;
        const conv = await Conversation.findById(req.params.id);
        if (!conv) return res.status(404).json({ message: "Conversation not found" });

        // Only admins or creator can edit
        const isAdmin = conv.admins?.some(a => a.toString() === req.user._id.toString());
        const isCreator = conv.createdBy?.toString() === req.user._id.toString();
        if (!isAdmin && !isCreator) {
            return res.status(403).json({ message: "Only admins can edit this group" });
        }

        if (name !== undefined) conv.name = name;
        if (description !== undefined) conv.description = description;
        await conv.save();

        const populated = await conv.populate('participants', 'name email role jobTitle');
        res.json({ conversation: populated });
    } catch (error) {
        console.error("Update conversation error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

/**
 * POST /api/chat/conversations/:id/leave
 * Leave a conversation
 */
exports.leaveConversation = async (req, res) => {
    try {
        const conv = await Conversation.findById(req.params.id);
        if (!conv) return res.status(404).json({ message: "Conversation not found" });

        conv.participants = conv.participants.filter(
            p => p.toString() !== req.user._id.toString()
        );
        conv.admins = (conv.admins || []).filter(
            a => a.toString() !== req.user._id.toString()
        );

        // If no participants left, delete conversation
        if (conv.participants.length === 0) {
            await Conversation.findByIdAndDelete(req.params.id);
            return res.json({ message: "Group deleted (no members left)" });
        }

        // If no admins left, promote first participant
        if (conv.admins.length === 0 && conv.participants.length > 0) {
            conv.admins = [conv.participants[0]];
        }

        await conv.save();
        res.json({ message: "You left the group" });
    } catch (error) {
        console.error("Leave conversation error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

/**
 * POST /api/chat/conversations/:id/participants
 * Add participants to a group
 */
exports.addParticipants = async (req, res) => {
    try {
        const { userIds } = req.body;
        if (!userIds || userIds.length === 0) {
            return res.status(400).json({ message: "No users specified" });
        }

        const conv = await Conversation.findById(req.params.id);
        if (!conv) return res.status(404).json({ message: "Conversation not found" });

        // Only admins can add
        const isAdmin = conv.admins?.some(a => a.toString() === req.user._id.toString());
        const isCreator = conv.createdBy?.toString() === req.user._id.toString();
        if (!isAdmin && !isCreator) {
            return res.status(403).json({ message: "Only admins can add members" });
        }

        // Add new participants (avoid duplicates)
        const existingIds = conv.participants.map(p => p.toString());
        const newIds = userIds.filter(id => !existingIds.includes(id));
        conv.participants.push(...newIds);
        await conv.save();

        const populated = await conv.populate('participants', 'name email role jobTitle');
        res.json({ conversation: populated });
    } catch (error) {
        console.error("Add participants error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

/**
 * DELETE /api/chat/conversations/:id/participants/:userId
 * Remove a participant from a group
 */
exports.removeParticipant = async (req, res) => {
    try {
        const { id, userId } = req.params;
        const conv = await Conversation.findById(id);
        if (!conv) return res.status(404).json({ message: "Conversation not found" });

        const isAdmin = conv.admins?.some(a => a.toString() === req.user._id.toString());
        const isCreator = conv.createdBy?.toString() === req.user._id.toString();
        if (!isAdmin && !isCreator) {
            return res.status(403).json({ message: "Only admins can remove members" });
        }

        conv.participants = conv.participants.filter(p => p.toString() !== userId);
        conv.admins = (conv.admins || []).filter(a => a.toString() !== userId);
        await conv.save();

        const populated = await conv.populate('participants', 'name email role jobTitle');
        res.json({ conversation: populated });
    } catch (error) {
        console.error("Remove participant error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

/**
 * DELETE /api/chat/conversations/:id
 * Delete a conversation (creator/admin only)
 */
exports.deleteConversation = async (req, res) => {
    try {
        const conv = await Conversation.findById(req.params.id);
        if (!conv) return res.status(404).json({ message: "Conversation not found" });

        const isCreator = conv.createdBy?.toString() === req.user._id.toString();
        const isAdmin = conv.admins?.some(a => a.toString() === req.user._id.toString());
        if (!isCreator && !isAdmin) {
            return res.status(403).json({ message: "Only the creator or an admin can delete this group" });
        }

        // Delete all messages in the conversation
        await Message.deleteMany({ conversationId: req.params.id });
        await Conversation.findByIdAndDelete(req.params.id);

        res.json({ message: "Group deleted" });
    } catch (error) {
        console.error("Delete conversation error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

/**
 * GET /api/chat/users
 * Get all users in the same org (for member picker)
 */
exports.getOrgUsers = async (req, res) => {
    try {
        const users = await User.find(
            { orgCode: req.user.orgCode },
            'name email role jobTitle'
        ).sort({ name: 1 });

        res.json({ users });
    } catch (error) {
        console.error("Get org users error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

/**
 * POST /api/chat/conversations/:id/messages
 * Send a message to a conversation
 */
exports.sendMessage = async (req, res) => {
    try {
        const { id } = req.params; // Conversation ID
        const { text, anonymous, isAnonymous: isAnonAlt } = req.body;
        const isAnonymous = anonymous || isAnonAlt || false; // Frontend sends 'anonymous', accept both

        let senderId = req.user.id;
        let encryptedSenderId = null;

        if (isAnonymous) {
            encryptedSenderId = encrypt(senderId.toString());
            senderId = null;
        }

        const msg = await Message.create({
            conversationId: id,
            senderId,
            encryptedSenderId,
            content: text, // Model uses content, frontend sends text
            isAnonymous,
            timestamp: new Date()
        });

        // Update conversation lastMessage
        await Conversation.findByIdAndUpdate(id, {
            lastMessage: { text, createdAt: msg.timestamp }
        });

        if (msg.senderId) {
            await msg.populate('senderId', 'name');
        }

        // Return mapped message
        const mappedMessage = {
            _id: msg._id,
            text: msg.content,
            createdAt: msg.timestamp,
            author: msg.senderId ? { _id: msg.senderId._id, name: msg.senderId.name } : null,
            anonymous: msg.isAnonymous,
            isInsight: msg.isInsight
        };

        // Emit to all clients in the conversation room via Socket.IO
        try {
            const socket = require('../socket');
            const io = socket.getIO();
            io.to(id).emit('receive_message', {
                conversationId: id,
                message: mappedMessage,
            });
            console.log(`[ChatController] Emitted receive_message to room ${id}`);
        } catch (socketErr) {
            console.error('Socket emit error (non-fatal):', socketErr.message);
        }

        res.status(201).json({ message: mappedMessage });
    } catch (error) {
        console.error("Send message error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

/**
 * POST /api/chat/messages/:id/insight
 * Toggle insight status
 */
exports.markMessageInsight = async (req, res) => {
    try {
        const { id } = req.params; // Message ID
        const msg = await Message.findById(id);
        if (!msg) return res.status(404).json({ message: "Message not found" });

        msg.isInsight = !msg.isInsight;
        await msg.save();

        // Map to frontend structure
        const mappedMessage = {
            _id: msg._id,
            text: msg.content, // Map content -> text
            createdAt: msg.timestamp, // Map timestamp -> createdAt
            author: msg.senderId, // Assuming senderId is an ID, if populated needed, we need to populate.
            // However, since it's an update, the frontend might already have the author.
            // But to be safe, let's return what we have or populate.
            anonymous: msg.isAnonymous,
            isInsight: msg.isInsight
        };

        // Populate if needed for consistency, though frontend might preserve author if we merged. 
        // But since we replace the whole object:
        await msg.populate('senderId', 'name');
        mappedMessage.author = msg.senderId;

        res.json({ message: mappedMessage });
    } catch (error) {
        console.error("Mark insight error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// AI Feedback
exports.getAIFeedback = async (req, res) => {
    try {
        const { text, personas } = req.body;
        console.log(`[ChatController] Requesting AI feedback for text: "${text?.substring(0, 50)}..." personas: ${JSON.stringify(personas)}`);

        if (!text || !text.trim()) {
            return res.status(400).json({ message: "Content is required for AI feedback." });
        }

        const personaList = personas && personas.length > 0 ? personas : ['team_lead'];

        // Generate feedback for each persona in parallel, with a per-persona timeout
        const feedbackPromises = personaList.map(async (persona) => {
            try {
                // Add a 30s timeout per persona call
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('AI response timed out')), 30000)
                );
                const feedbackPromise = aiService.generateTextFeedback(text.trim(), persona);

                const feedbackText = await Promise.race([feedbackPromise, timeoutPromise]);
                return { persona, feedback: feedbackText };
            } catch (err) {
                console.error(`[ChatController] Error generating feedback for ${persona}:`, err.message);
                return { persona, feedback: `⚠️ Could not generate ${persona} feedback at this time. Please try again.` };
            }
        });

        const feedbacks = await Promise.all(feedbackPromises);
        console.log(`[ChatController] Generated ${feedbacks.length} feedbacks successfully.`);

        res.json({ feedbacks });
    } catch (error) {
        console.error("AI Feedback error:", error);
        res.status(500).json({ message: "Error generating feedback. Please try again." });
    }
};

/**
 * PUT /api/chat/conversations/:id/reviewers
 * Manage reviewers for a conversation (admin only)
 * Body: { reviewerIds: [userId, ...] }
 */
exports.manageReviewers = async (req, res) => {
    try {
        const { reviewerIds } = req.body;
        const conv = await Conversation.findById(req.params.id);
        if (!conv) return res.status(404).json({ message: "Conversation not found" });

        // Only admins or creator can manage reviewers
        const isAdmin = conv.admins?.some(a => a.toString() === req.user._id.toString());
        const isCreator = conv.createdBy?.toString() === req.user._id.toString();
        if (!isAdmin && !isCreator) {
            return res.status(403).json({ message: "Only admins can manage reviewers" });
        }

        conv.reviewers = reviewerIds || [];
        await conv.save();

        const populated = await conv.populate([
            { path: 'participants', select: 'name email role jobTitle' },
            { path: 'admins', select: 'name email role' },
            { path: 'reviewers', select: 'name email role' },
            { path: 'createdBy', select: 'name email' }
        ]);

        res.json({ conversation: populated });
    } catch (error) {
        console.error("Manage reviewers error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

/**
 * GET /api/chat/conversations/:id/insights
 * Get all insight-marked messages for a conversation
 * //test commit
 */
exports.getInsights = async (req, res) => {
    try {
        const { id } = req.params;
        const messages = await Message.find({ conversationId: id, isInsight: true })
            .sort({ timestamp: -1 })
            .populate('senderId', 'name');

        const mappedMessages = messages.map(msg => ({
            _id: msg._id,
            text: msg.content,
            createdAt: msg.timestamp,
            author: msg.senderId,
            anonymous: msg.isAnonymous,
            isInsight: msg.isInsight
        }));

        res.json({ insights: mappedMessages });
    } catch (error) {
        console.error("Get insights error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

/**
 * POST /api/chat/conversations/:id/summarize
 * AI-powered chat summarization
 * Body: { question?: string } - optional follow-up question
 */
exports.summarizeChat = async (req, res) => {
    try {
        const { id } = req.params;
        const { question } = req.body;

        // Fetch all messages for the conversation
        const messages = await Message.find({ conversationId: id })
            .sort({ timestamp: 1 })
            .populate('senderId', 'name')
            .limit(200); // Cap to last 200 messages

        if (messages.length === 0) {
            return res.json({ summary: "No messages to summarize in this conversation yet." });
        }

        // Build chat transcript for AI
        const transcript = messages.map(msg => {
            const author = msg.isAnonymous ? 'Anonymous' : (msg.senderId?.name || 'Unknown');
            const time = msg.timestamp ? new Date(msg.timestamp).toLocaleString() : '';
            return `[${time}] ${author}: ${msg.content}`;
        }).join('\n');

        let systemPrompt;
        let userPrompt;

        if (question) {
            // Follow-up Q&A mode
            systemPrompt = `You are an intelligent assistant helping users understand a team chat conversation from a workplace app called "Commit Kings".

You have the full chat transcript below. Answer the user's question based ONLY on what's in the transcript. Be concise, specific, and reference who said what when relevant.

If the answer isn't found in the transcript, say so clearly.

Chat Transcript:
---
${transcript}
---`;
            userPrompt = question;
        } else {
            // Summary mode
            systemPrompt = `You are an intelligent assistant that summarizes team chat conversations from a workplace app called "Commit Kings".

Provide a well-structured, concise summary covering:
- **Key Topics Discussed**: Main subjects and themes
- **Important Decisions**: Any decisions made or agreed upon
- **Action Items**: Tasks or follow-ups mentioned
- **Notable Contributions**: Key points made by participants
- **Unresolved Questions**: Open items that need follow-up

Keep the summary under 400 words. Use bullet points for clarity. Be factual and objective.`;
            userPrompt = `Please summarize the following team chat conversation:\n\n---\n${transcript}\n---\n\nProvide your structured summary now.`;
        }

        console.log(`[ChatController] Summarizing chat for conversation ${id} (${messages.length} messages)${question ? ' with follow-up question' : ''}`);

        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('AI response timed out')), 45000)
        );

        const OpenAI = require('openai');
        const openai = new OpenAI({
            baseURL: "https://openrouter.ai/api/v1",
            apiKey: process.env.OPENROUTER_API_KEY,
        });
        const MODEL = process.env.AI_MODEL || "google/gemini-2.0-flash-lite-001";

        const completionPromise = openai.chat.completions.create({
            model: MODEL,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            max_tokens: 1000,
            temperature: 0.5,
        });

        const completion = await Promise.race([completionPromise, timeoutPromise]);

        if (!completion.choices || completion.choices.length === 0) {
            throw new Error("Empty response from AI service.");
        }

        const summary = completion.choices[0].message.content;
        console.log(`[ChatController] Summary generated successfully (Length: ${summary.length})`);

        res.json({ summary });
    } catch (error) {
        console.error("Summarize chat error:", error);
        res.status(500).json({ message: "Failed to generate summary. Please try again." });
    }
};
