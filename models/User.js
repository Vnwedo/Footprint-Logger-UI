const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    },
    // ● Ensure there is a view for streak tracking
    streak: {
        type: Number,
        default: 0
    },
    lastLogDate: {
        type: String, // Stored as "YYYY-MM-DD" for easy daily comparison
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('User', UserSchema);