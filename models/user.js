const mongoose = require('mongoose');
const nanoid = require('../utils/nanoid')();
const { permissions, adminPermissions } = require('../constants');

const userSchema = new mongoose.Schema({
    uuid: {
        type: String,
        default: () => nanoid()
    },
    username: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    status: String,
    activated: {
        type: Boolean,
        required: true,
        default: false
    },
    roles: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Role'
        }
    ],
    banned: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

userSchema.methods.hasPermission = async function (permission) {
    if (!this.roles.length) return false;
    if (!permissions.includes(permission)) return false;
    let hasPerm = false;

    await this.populate('roles');

    this.roles.map((r) => {
        if (r.hasPermission(permission)) {
            hasPerm = true;
        }
    });

    return hasPerm;
}

userSchema.methods.isAdmin = async function () {
    if (!this.roles.length) return false;
    const permissions = await this.getPermissions();
    let isAdmin = false;

    for (const [ k ] of Object.entries(permissions)) {
        let perm = adminPermissions.find((p) => k.toLowerCase() === p.toLowerCase());
        if (perm) {
            isAdmin = true;
            break;
        }
    }

    return isAdmin;
}

userSchema.methods.getPermissions = async function () {
    let userPermissions = {};

    await Promise.all(permissions.map(async (p) => {
        userPermissions[p] = await this.hasPermission(p);
    }));

    return userPermissions;
}

userSchema.methods.getHighestRole = async function () {
    let highestRole = null;

    await this.populate('roles');

    await Promise.all(this.roles.map((r) => {
        if (r.defaultRole || typeof r.order !== 'number') return;
        if (!highestRole) highestRole = r;
        if (r.order < highestRole.order) highestRole = r;
    }));

    return highestRole;
}

module.exports = mongoose.model('User', userSchema);
