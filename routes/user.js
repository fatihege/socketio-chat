const express = require('express');
const router = express.Router();

const userController = require('../controllers/user');
const csrf = require('../middlewares/csrf');
const isAuthenticated = require('../middlewares/is-authenticated');

router.get('/chat', csrf, isAuthenticated, userController.getChat);

router.get('/edit-account', csrf, isAuthenticated, userController.getEditAccount);
router.post('/edit-account', csrf, isAuthenticated, userController.postEditAccount);

router.post('/logout', csrf, isAuthenticated, userController.postLogout);

module.exports = router;
