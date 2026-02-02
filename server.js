/**
 * EcoTrack - Main Server Entry Point
 * Optimized for Render Deployment & Real-Time Insights
 */

const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const http = require('http');           
const { Server } = require('socket.io'); 
const connectDB = require('./config/db');

// 1. Load Environment Variables
dotenv.config();

const app = express();

/** * 2. Create HTTP Server & Socket.io
 * Wrapping Express in an HTTP server is required for WebSockets.
 */
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", 
        methods: ["GET", "POST"]
    }
});

// 3. Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

/**
 * 4. Global Socket Instance
 * Shared so route files can trigger real-time tips.
 */
app.set('socketio', io);

// 5. Import Routes
const authRoutes = require('./routes/auth');
const logRoutes = require('./routes/logs');

// 6. Use Routes
app.use('/api/auth', authRoutes);
app.use('/api/logs', logRoutes);

// 7. Socket.io Connection Logic
io.on('connection', (socket) => {
    console.log(`📡 New user connected: ${socket.id}`);
    socket.on('disconnect', () => {
        console.log('🔌 User disconnected');
    });
});

// 8. Handle Single Page Application (SPA) Routing
app.get(/(.*)/, (req, res) => {
    // Only serve index.html if the request isn't for an API route
    if (!req.url.startsWith('/api')) {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    }
});

/**
 * 9. Start Server & Connect Database
 * We listen FIRST so Render detects the open port 10000 immediately.
 */
const PORT = process.env.PORT || 10000; // Updated default to match Render

server.listen(PORT, '0.0.0.0', () => {
    console.log(`
    ✅ EcoTrack Server Live
    🚀 Port: ${PORT}
    📡 WebSockets: Enabled
    `);

    // 10. Connect to database AFTER the port is successfully bound
    // This prevents a slow DB connection from failing the Render deploy
    connectDB();
});