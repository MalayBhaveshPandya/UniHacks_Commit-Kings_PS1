const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const socket = require('./socket');
const authMiddleware = require('./middlewares/auth.middleware');

// Routes
const authRoutes = require('./routes/auth.routes');
const postRoutes = require('./routes/post.routes');
const chatRoutes = require('./routes/chat.routes');
const vaultRoutes = require('./routes/vault.routes');

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());

// Database Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/commit-kings-db', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.error('MongoDB Connection Error:', err));

// Initialize Socket.io
socket.init(server);

const meetingRoutes = require('./routes/meeting.routes');

// API Routes
app.use('/api/auth', authRoutes);              // signup/login are public; /me & /profile use their own auth
app.use('/api/posts', postRoutes);             // router-level auth middleware applied inside post.routes.js
app.use('/api/chat', authMiddleware, chatRoutes);  // chat + AI feedback
app.use('/api/meetings', authMiddleware, meetingRoutes);
app.use('/api/vault', authMiddleware, vaultRoutes);

// Base Route
app.get('/', (req, res) => {
    res.send('Commit Kings Backend is Running');
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
