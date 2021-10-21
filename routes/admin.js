const express = require('express');
const router = express.Router();

const User = require('../models/user');
const Role = require('../models/role');

const adminController = require('../controllers/admin');
const csrf = require('../middlewares/csrf');
const isAuthenticated = require('../middlewares/is-authenticated');
const isAdmin = require('../middlewares/is-admin');

const { validPermissions } = require('../constants');

const countMiddleware = async (req, res, next) => {
    req.counts = {};

    User
        .find({ activated: true })
        .limit(201)
        .select('activated')
        .then((users) => {
            req.counts.users = users.length > 200 ? '200+' : users.length;
            return User.count({ activated: false }).limit(201);
        })
        .then((count) => {
            req.counts.pendingUsers = count > 200 ? '200+' : count;
            return User.count({ banned: true }).limit(201);
        })
        .then((count) => {
            req.counts.bannedUsers = count > 200 ? '200+' : count;
            return Role.count({ defaultRole: false });
        })
        .then((count) => {
            req.counts.roles = count;
            return next();
        })
        .catch((err) => console.error(err));
}

const middlewares = [csrf, isAuthenticated, isAdmin, countMiddleware];

const settingsMiddleware = async (req, res, next) => {
    if (await req.user.hasPermission(validPermissions.MANAGE_SERVER)) return next();
    else return res.redirect('/admin/');
}

const registerUserMiddleware = async (req, res, next) => {
    if (await req.user.hasPermission(validPermissions.REGISTER_USER)) return next();
    else return res.redirect('/admin/');
}

const rolesMiddleware = async (req, res, next) => {
    if (await req.user.hasPermission(validPermissions.MANAGE_ROLES)) return next();
    else return res.redirect('/admin/');
}

const usersMiddleware = async (req, res, next) => {
    if (await req.user.hasPermission(validPermissions.MANAGE_USERS)) return next();
    else return res.redirect('/admin/');
}

router.get('/', csrf, isAuthenticated, isAdmin, countMiddleware, adminController.getPanel);

router.get('/settings', ...middlewares, settingsMiddleware, adminController.getSettings);
router.post('/settings', ...middlewares, settingsMiddleware, adminController.postSettings);

router.get('/register-user', ...middlewares, registerUserMiddleware, adminController.getRegisterUser);
router.post('/register-user', ...middlewares, registerUserMiddleware, adminController.postRegisterUser);

router.get('/roles/create', ...middlewares, rolesMiddleware, adminController.getCreateRole);
router.post('/roles/create', ...middlewares, rolesMiddleware, adminController.postCreateRole);
router.post('/roles/delete', ...middlewares, rolesMiddleware, adminController.postDeleteRole);
router.get('/roles/:id', ...middlewares, rolesMiddleware, adminController.getRoleByID);
router.post('/roles/edit', ...middlewares, rolesMiddleware, adminController.postEditRole);
router.get('/roles', ...middlewares, rolesMiddleware, adminController.getRoles);

router.post('/users/activate', ...middlewares, usersMiddleware, adminController.postActivateUser);
router.post('/users/deactivate', ...middlewares, usersMiddleware, adminController.postDeactivateUser);
router.post('/users/delete', ...middlewares, usersMiddleware, adminController.postDeleteUser);
router.get('/pending-users', ...middlewares, usersMiddleware, adminController.getPendingUsers);
router.get('/users/:id', ...middlewares, usersMiddleware, adminController.getUserByID);
router.post('/users/edit', ...middlewares, usersMiddleware, adminController.postEditUser);
router.post('/users/ban', ...middlewares, usersMiddleware, adminController.postBanUser);
router.post('/users/unban', ...middlewares, usersMiddleware, adminController.postUnbanUser);
router.get('/users', ...middlewares, usersMiddleware, adminController.getUsers);

module.exports = router;
