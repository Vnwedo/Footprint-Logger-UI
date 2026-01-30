/**
 * EcoTrack - Full-Stack Server
 * Features: Auth, Activity Logging, Streak Tracking, & Community Stats
 */

const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(express.static('public')); // Serve your frontend files

// 1. Database Connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ecotrack')
    .then(() => console.log("Connected to MongoDB"))
    .catch(err => console.error("Could not connect to MongoDB", err));

// 2. Data Models
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    streak: { type: Number, default: 0 },
    lastLogDate: { type: String } // Format: YYYY-MM-DD
});

const LogSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    category: String,
    amount: Number,
    co2: Number,
    unit: String,
    date: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);
const Log = mongoose.model('Log', LogSchema);

// 3. Authentication Routes
app.post('/api/auth/register', async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        const user = new User({
            username: req.body.username,
            password: hashedPassword
        });
        await user.save();
        res.status(201).json({ message: "User created" });
    } catch (err) {
        res.status(400).json({ error: "Registration failed" });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const user = await User.findOne({ username: req.body.username });
    if (!user || !(await bcrypt.compare(req.body.password, user.password))) {
        return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'secret_key');
    res.json({ token, userId: user._id, username: user.username, streak: user.streak });
});

// 4. Activity & Community Routes
app.post('/api/logs', async (req, res) => {
    const { userId, category, amount, co2, unit } = req.body;
    
    try {
        // Create new log
        const log = new Log({ userId, category, amount, co2, unit });
        await log.save();

        // Streak Logic
        const user = await User.findById(userId);
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

        if (user.lastLogDate === yesterday) {
            user.streak += 1;
        } else if (user.lastLogDate !== today) {
            user.streak = 1;
        }
        
        user.lastLogDate = today;
        await user.save();

        res.json({ success: true, streak: user.streak });
    } catch (err) {
        res.status(500).json({ error: "Failed to save log" });
    }
});

app.get('/api/logs/:userId', async (req, res) => {
    const logs = await Log.find({ userId: req.params.userId }).sort({ date: -1 });
    res.json(logs);
});

app.get('/api/community/stats', async (req, res) => {
    // Calculate global average CO2
    const stats = await Log.aggregate([
        { $group: { _id: null, avgCO2: { $avg: "$co2" } } }
    ]);

    // Leaderboard (Lowest 5 emitters)
    const leaderboard = await Log.aggregate([
        { $group: { _id: "$userId", total: { $sum: "$co2" } } },
        { $sort: { total: 1 } },
        { $limit: 5 },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'userInfo' } },
        { $unwind: "$userInfo" },
        { $project: { username: "$userInfo.username", total: 1 } }
    ]);

    res.json({
        average: stats[0]?.avgCO2 || 0,
        leaderboard: leaderboard
    });
});

// 5. Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));