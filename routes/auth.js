const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ● Build authentication routes (register)
router.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // Check if user exists
        let user = await User.findOne({ username });
        if (user) return res.status(400).json({ message: "User already exists" });

        // Hash password before saving
        const hashedPassword = await bcrypt.hash(password, 10);
        user = new User({ username, password: hashedPassword });
        
        await user.save();
        res.status(201).json({ message: "User registered successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ● Build authentication routes (login)
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });
        
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '24h' });
        res.json({ token, userId: user._id, username: user.username, streak: user.streak });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;