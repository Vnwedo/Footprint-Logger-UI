/**
 * EcoTrack - Main Server Entry Point (Updated for Real-Time Insights)
 */

const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const http = require('http');           // 1. Required for Socket.io
const { Server } = require('socket.io'); // 2. Required for Socket.io
const connectDB = require('./config/db');

// Load Environment Variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

/** * 3. Create HTTP Server
 * We wrap the 'app' (Express) inside a native Node HTTP server.
 */
const server = http.createServer(app);

/** * 4. Initialize Socket.io
 * This attaches the WebSocket engine to our server.
 */
const io = new Server(server, {
    cors: {
        origin: "*", // Adjust this in production for security
        methods: ["GET", "POST"]
    }
});

// 5. Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

/**
 * 6. Global Socket Instance
 * This allows our route files (like logs.js) to access 'io' via the request object.
 */
app.set('socketio', io);

// 7. Import Routes
const authRoutes = require('./routes/auth');
const logRoutes = require('./routes/logs');

// 8. Use Routes
app.use('/api/auth', authRoutes);
app.use('/api/logs', logRoutes);

// 9. Socket.io Connection Logic
io.on('connection', (socket) => {
    console.log(`📡 New user connected: ${socket.id}`);

    socket.on('disconnect', () => {
        console.log('🔌 User disconnected');
    });
});

// 10. SPA Handler
app.get(/(.*)/, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 11. Start Server (Crucial: use 'server.listen', not 'app.listen')
const PORT = process.env.PORT || 3000;
server.listen(PORT,'0.0.0.0',() => {
    console.log(`
    ✅ EcoTrack Insight Engine Started
    🚀 Port: ${PORT}
    📡 WebSockets: Enabled
    `);
});