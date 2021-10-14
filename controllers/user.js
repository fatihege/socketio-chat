const { encrypt } = require('../utils/hashing');
require('dotenv').config();

exports.getChat = (req, res, next) => {
    const hashedUserID = encrypt(req.user._id.toString());
    res.cookie('hashed_id', hashedUserID);
    res.render('user/chat', {
        title: process.env.APP_NAME
    });
}

exports.postLogout = (req, res, next) => {
    req.session.destroy((err) => {
        if (err) {
            console.error(err);
        }

        res.redirect('/');
    });
}
