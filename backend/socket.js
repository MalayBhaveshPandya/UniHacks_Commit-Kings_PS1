const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const Message = require('./models/Message');
const aiService = require('./services/ai.service');
const crypto = require('crypto');

// Simple encryption setup (Must match chat.controller.js)
const ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32);
const IV_LENGTH = 16;

function encrypt(text) {
    let iv = crypto.randomBytes(IV_LENGTH);
    let cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

let io;

module.exports = {
    init: (server) => {
        io = socketIo(server, {
            cors: {
                origin: "*", // Adjust for production
                methods: ["GET", "POST"]
            }
        });

        // Middleware for Auth — verify JWT token
        io.use(async (socket, next) => {
            const token = socket.handshake.auth.token;
            if (token) {
                try {
                    const decoded = jwt.verify(token, process.env.JWT_SECRET);
                    const user = await User.findById(decoded.id);
                    if (user) {
                        socket.user = {
                            id: user._id.toString(),
                            username: user.name,
                            role: user.role
                        };
                        return next();
                    }
                } catch (err) {
                    console.error('Socket auth error:', err.message);
                }
            }
            // Reject unauthenticated connections
            next(new Error('Authentication required'));
        });

        io.on('connection', (socket) => {
            console.log('New client connected:', socket.id, socket.user.username);

            socket.on('join_room', (room) => {
                socket.join(room);
                console.log(`User ${socket.user.username} joined room: ${room}`);
            });

            socket.on('leave_room', (room) => {
                socket.leave(room);
                console.log(`User ${socket.user.username} left room: ${room}`);
            });

            socket.on('send_message', async (data) => {
                // data: { channelId, receiverId, content, isAnonymous }
                try {
                    const { channelId, receiverId, content, isAnonymous } = data;

                    let senderId = socket.user.id; // Corrected: use socket.user.id, not req.user.id
                    let encryptedSenderId = null;

                    // Handle Anonymous
                    if (isAnonymous) {
                        // Ensure we have a string ID to encrypt 
                        // (Mock IDs are strings, real ObjectIds need .toString())
                        encryptedSenderId = encrypt(senderId.toString());
                        senderId = null;
                    }

                    const newMessage = new Message({
                        senderId,
                        encryptedSenderId,
                        receiverId,
                        channelId,
                        content,
                        isAnonymous,
                        timestamp: new Date()
                    });

                    const savedMessage = await newMessage.save();

                    // Populate if not anonymous
                    if (savedMessage.senderId) {
                        // We can't populate nicely without a request context or reimplementing.
                        // But for socket return, we can just attach the known username
                        // Or query DB.
                        // For speed, let's just return the struct with sender details we know.
                        const msgObj = savedMessage.toObject();
                        msgObj.senderId = { _id: socket.user.id, username: socket.user.username };
                        io.to(channelId || receiverId).emit('receive_message', {
                            conversationId: channelId,
                            message: msgObj
                        });
                    } else {
                        // Anonymous
                        const msgObj = savedMessage.toJSON(); // Uses the masking logic
                        io.to(channelId || receiverId).emit('receive_message', {
                            conversationId: channelId,
                            message: msgObj
                        });
                    }

                } catch (error) {
                    console.error("Socket Error (send_message):", error);
                    socket.emit('error', { message: "Failed to send message" });
                }
            });

            socket.on('typing', (data) => {
                socket.to(data.room).emit('display_typing', { username: socket.user.username });
            });

            socket.on('ai_feedback_request', async (data) => {
                try {
                    const { content, persona } = data;
                    const feedback = await aiService.generateTextFeedback(content, persona);
                    socket.emit('ai_feedback_response', { feedback });
                } catch (error) {
                    console.error("Socket Error (ai_feedback_request):", error);
                    socket.emit('error', { message: "AI Feedback failed" });
                }
            });

            socket.on('disconnect', () => {
                console.log('Client disconnected:', socket.id);
            });
        });

        return io;
    },
    getIO: () => {
        if (!io) {
            throw new Error("Socket.io not initialized!");
        }
        return io;
    }
};
