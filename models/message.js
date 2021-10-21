const mongoose = require('mongoose');
const nanoid = require('../utils/nanoid')();

const messageSchema = new mongoose.Schema({
    uuid: {
        type: String,
        default: () => nanoid()
    },
    content: {
        type: String,
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    reply: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message'
    }
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);
