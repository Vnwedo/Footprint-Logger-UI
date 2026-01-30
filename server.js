/**
 * EcoTrack - Main Server Entry Point
 */

const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// 1. Load Environment Variables
dotenv.config();

// 2. Connect to MongoDB
connectDB();

const app = express();

// 3. Middleware
app.use(express.json()); // Parses incoming JSON requests
app.use(express.static(path.join(__dirname, 'public'))); // Serves your HTML/CSS/JS

// 4. Import Routes
const authRoutes = require('./routes/auth');
const logRoutes = require('./routes/logs');

// 5. Use Routes
// Maps auth logic to /api/auth and activity logic to /api/logs
app.use('/api/auth', authRoutes);
app.use('/api/logs', logRoutes);

// 6. Handle SPA (Optional)
// If a user refreshes on a subpage, serve index.html
app.get(/(.*)/, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 7. Start Server
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
    console.log(`
    ✅ EcoTrack Server Started
    🚀 Port: ${PORT}
    🌐 Mode: ${process.env.NODE_ENV || 'development'}
    `);
});

// Handle Unhandled Rejections (e.g., DB connection loss)
process.on('unhandledRejection', (err, promise) => {
    console.log(`Error: ${err.message}`);
    server.close(() => process.exit(1));
});