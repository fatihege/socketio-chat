const express = require('express');
const router = express.Router();

const guestController = require('../controllers/guest');
const isNotAuthenticated = require('../middlewares/is-not-authenticated');
const csrf = require('../middlewares/csrf');

router.get('/', csrf, guestController.getIndex);
router.get('/help', csrf, guestController.getHelp);
router.get('/banned', csrf, (req, res, next) => {
    if (!req.user || !req.user.banned || !req.user.activated) return res.redirect('/');
    return next();
}, guestController.getBanned);

router.get('/login', csrf, isNotAuthenticated, guestController.getLogin);
router.post('/login', csrf, isNotAuthenticated, guestController.postLogin);

router.get('/register', csrf, isNotAuthenticated, guestController.getRegister);
router.post('/register', csrf, isNotAuthenticated, guestController.postRegister);

module.exports = router;
