const mongoose = require('mongoose');

const serverSchema = new mongoose.Schema({
    _id: {
        type: Number,
        default: 1
    },
    registrable: {
        type: Boolean,
        default: true
    },
    loginOnlyAdmins: {
        type: Boolean,
        default: false
    }
}, { collection: 'server' });

module.exports = mongoose.model('Server', serverSchema);
