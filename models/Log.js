const mongoose = require('mongoose');

const LogSchema = new mongoose.Schema({
    // ● Securely store and retrieve user-specific activity logs
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    category: {
        type: String,
        required: true,
        enum: ['Transport', 'Food', 'Energy'] // Matches your original categories
    },
    amount: {
        type: Number,
        required: true
    },
    unit: {
        type: String,
        required: true
    },
    co2: {
        type: Number,
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Log', LogSchema);