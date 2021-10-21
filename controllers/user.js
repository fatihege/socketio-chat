const User = require('../models/user');
const validatePost = require('../utils/validate-post');
const filterUsername = require('../utils/filter-username');
const { encrypt } = require('../utils/hashing');
require('dotenv').config();

exports.getChat = async (req, res, next) => {
    const hashedUserID = encrypt(req.user._id.toString());
    const isAdmin = await req.user.isAdmin();
    res.cookie('hashed_id', hashedUserID);
    res.render('user/chat', {
        title: process.env.APP_NAME,
        username: req.user.username,
        isAdmin,
        permissions: await req.user.getPermissions(),
    });
}

exports.getEditAccount = (req, res, next) => {
    const hashedUserID = encrypt(req.user._id.toString());
    res.cookie('hashed_id', hashedUserID);
    res.render('user/edit-account', {
        title: 'Edit Account',
        username: req.user.username,
    });
}

exports.postEditAccount = (req, res, next) => {
    const errors = validatePost(req.body, {
        username: {
            name: 'Username',
            required: true,
            trim: true,
            min: 3,
            max: 25
        }
    });

    const username = filterUsername(req.body.username);

    if (errors) {
        req.session.flashMessage = errors[0];
        req.session.inputValues = req.body;
        req.session.save((err) => {
            if (err) {
                console.error(err);
            }

            return res.redirect('/edit-account');
        });
    } else {
        User
            .findOne({ $or: [ { username } ] })
            .then((user) => {
                if (user) {
                    req.session.flashMessage = 'There is a user belonging to this information.';
                    req.session.inputValues = req.body;
                    req.session.save((err) => {
                        if (err) {
                            console.error(err);
                        }

                        return res.redirect('/edit-account');
                    });
                } else {
                    User
                        .findById(req.user._id)
                        .then((user) => {
                            user.username = username;
                            return user.save();
                        })
                        .then(() => res.redirect('/chat'))
                        .catch((err) => console.error(err));
                }
            })
            .catch((err) => console.error(err));
    }
}

exports.postLogout = (req, res, next) => {
    req.session.destroy((err) => {
        if (err) {
            console.error(err);
        }

        res.redirect('/');
    });
}
