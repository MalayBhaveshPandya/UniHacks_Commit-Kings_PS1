const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const socket = require('./socket');
const authMiddleware = require('./middlewares/auth.middleware');

// Routes
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

// API Routes
app.use('/api/ai', authMiddleware, chatRoutes); // /api/ai prefix for chat/ai related
app.use('/api/vault', authMiddleware, vaultRoutes);

// Base Route
app.get('/', (req, res) => {
    res.send('Commit Kings Backend is Running');
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
