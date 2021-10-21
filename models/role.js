const mongoose = require('mongoose');
const nanoid = require('../utils/nanoid')();
const { permissions, defaultPermissions, validPermissions } = require('../constants');

const roleSchema = new mongoose.Schema({
    uuid: {
        type: String,
        default: () => nanoid()
    },
    name: {
        type: String,
        required: true
    },
    color: String,
    permissions: {
        type: String,
        required: true,
        default: defaultPermissions
    },
    defaultRole: {
        type: Boolean,
        default: false
    },
    order: {
        type: Number,
        required: true
    }
}, { timestamps: true });

roleSchema.methods.hasPermission = function (permission) {
    const perms = this.permissions.split(/|/);
    let hasPerm = false;

    perms.map((p, i) => {
        if (permissions[i] && permissions[i].trim().toLowerCase() === permission.trim().toLowerCase() && parseInt(p) === 1) {
            hasPerm = true;
        }

        if (permissions[i] === validPermissions.ADMINISTRATOR && parseInt(p) === 1) {
            hasPerm = true;
        }
    });

    return hasPerm;
}

roleSchema.methods.hasPermissionStrict = function (permission) {
    const perms = this.permissions.split(/|/);
    let hasPerm = false;

    perms.map((p, i) => {
        if (permissions[i] && permissions[i].trim().toLowerCase() === permission.trim().toLowerCase() && parseInt(p) === 1) {
            hasPerm = true;
        }
    });

    return hasPerm;
}

module.exports = mongoose.model('Role', roleSchema);
