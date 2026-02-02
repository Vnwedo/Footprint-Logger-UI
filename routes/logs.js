const express = require('express');
const router = express.Router();
const Log = require('../models/Log');
const User = require('../models/User');

// ● Securely retrieve user-specific activity logs
router.get('/:userId', async (req, res) => {
    try {
        const logs = await Log.find({ userId: req.params.userId }).sort({ date: -1 });
        res.json(logs);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch logs" });
    }
});

router.get('/insights/:userId', async (req, res) => {
    try {
        const insights = await Log.aggregate([
            { $match: { userId: new mongoose.Types.ObjectId(req.params.userId) } },
            { $group: { 
                _id: "$category", 
                total: { $sum: "$co2" },
                avgAmount: { $avg: "$amount" }
            }},
            { $sort: { total: -1 } }
        ]);

        if (insights.length === 0) {
            return res.json({ tip: "Start logging to see personalized tips!", category: "None" });
        }

        const topCategory = insights[0]._id;
        const tips = {
            'Transport': `Try cycling or walking for short trips to cut roughly ${(insights[0].total * 0.2).toFixed(1)}kg CO2 this week.`,
            'Food': "Consider a 'Meatless Monday' to significantly reduce your food-related footprint.",
            'Energy': "Switching off standby appliances could lower your energy impact by up to 10%."
        };

        res.json({
            topCategory,
            tip: tips[topCategory] || "Keep up the great work!",
            weeklyGoal: (insights[0].total * 0.9).toFixed(2) // Suggest 10% reduction
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ● Securely store user-specific activity logs & Update Streak
router.post('/', async (req, res) => {
    const { userId, category, amount, co2, unit } = req.body;
    try {
        const newLog = new Log({ userId, category, amount, co2, unit });
        await newLog.save();
        const io = req.app.get('socketio');
        io.emit('new-tip', { msg: `Great job logging! Based on your ${category} use, try...` });

        // ● Ensure there is a view for streak tracking
        const user = await User.findById(userId);
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

        if (user.lastLogDate === yesterday) {
            user.streak += 1;
        } else if (user.lastLogDate !== today) {
            user.streak = 1; // Start/Reset streak
        }
        user.lastLogDate = today;
        await user.save();

        res.json({ success: true, streak: user.streak });
    } catch (err) {
        res.status(500).json({ error: "Failed to save activity" });
    }
});

// ● Calculate average emission across all users & Simple leaderboard
router.get('/stats/community', async (req, res) => {
    try {
        // Calculate total average
        const stats = await Log.aggregate([
            { $group: { _id: null, avgCO2: { $avg: "$co2" } } }
        ]);

        // Simple leaderboard of low-footprint users
        const leaderboard = await Log.aggregate([
            { $group: { _id: "$userId", totalEmissions: { $sum: "$co2" } } },
            { $sort: { totalEmissions: 1 } },
            { $limit: 5 },
            { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
            { $unwind: "$user" },
            { $project: { username: "$user.username", total: "$totalEmissions" } }
        ]);

        res.json({ 
            average: stats[0]?.avgCO2 || 0, 
            leaderboard 
        });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch community data" });
    }
});

module.exports = router;