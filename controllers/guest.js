const bcrypt = require('bcrypt');
const User = require('../models/user');
const validatePost = require('../utils/validate-post');

exports.getIndex = (req, res, next) => {
    if (req.user) {
        res.redirect('/chat');
    } else {
        res.redirect('/login');
    }
}

exports.getHelp = (req, res, next) => {
    res.render('guest/help', {
        title: 'Help'
    });
}

exports.getLogin = (req, res, next) => {
    const flashMessage = req.session.flashMessage;
    const inputValues = req.session.inputValues;
    delete req.session.flashMessage;
    delete req.session.inputValues;

    res.render('guest/login', {
        title: 'Login',
        flashMessage,
        inputValues
    });
}

exports.postLogin = (req, res, next) => {
    const errors = validatePost(req.body, {
        email: {
            name: 'Email',
            required: true,
            trim: true,
            pattern: validatePost().patterns.email
        },
        password: {
            name: 'Password',
            required: true
        }
    });

    const email = req.body.email.trim();
    const password = req.body.password;

    if (errors) {
        req.session.flashMessage = errors[0];
        req.session.inputValues = req.body;
        req.session.save((err) => {
            if (err) {
                console.error(err);
            }

            return res.redirect('/login');
        });
    } else {
        User
            .findOne({ email })
            .then((user) => {
                if (!user) {
                    req.session.flashMessage = 'A user associated with this email address not found.';
                    req.session.inputValues = req.body;
                    req.session.save((err) => {
                        if (err) {
                            console.error(err);
                        }

                        return res.redirect('/login');
                    });
                } else {
                    if (!user.activated) {
                        req.session.flashMessage = 'This account not activated.';
                        req.session.inputValues = req.body;
                        req.session.save((err) => {
                            if (err) {
                                console.error(err);
                            }

                            return res.redirect('/login');
                        });

                        return;
                    }

                    bcrypt.compare(password, user.password)
                        .then((result) => {
                            if (result) {
                                req.session.user = user;
                                req.session.isAuthenticated = true;

                                req.session.save((err) => {
                                    if (err) {
                                        console.error(err);
                                    }

                                    const url = req.session.redirectTo || '/chat';
                                    delete req.session.redirectTo;
                                    res.redirect(url);
                                });
                            } else {
                                req.session.flashMessage = 'Passwords don\'t match.';
                                req.session.inputValues = req.body;

                                req.session.save((err) => {
                                    if (err) {
                                        console.error(err);
                                    }

                                    return res.redirect('/login');
                                });
                            }
                        })
                        .catch((err) => console.error(err));
                }
            })
            .catch((err) => console.error(err));
    }
}

exports.getRegister = (req, res, next) => {
    const flashMessage = req.session.flashMessage;
    const inputValues = req.session.inputValues;
    delete req.session.flashMessage;
    delete req.session.inputValues;

    res.render('guest/register', {
        title: 'Register',
        flashMessage,
        inputValues
    });
}

exports.postRegister = (req, res, next) => {
    const errors = validatePost(req.body, {
        username: {
            name: 'Username',
            required: true,
            trim: true,
            min: 3,
            max: 25
        },
        email: {
            name: 'Email',
            required: true,
            trim: true,
            pattern: validatePost().patterns.email
        },
        password: {
            name: 'Password',
            required: true,
            confirm: true,
            min: 5
        }
    });

    const username = req.body.username;
    const email = req.body.email;
    const password = req.body.password;

    if (errors) {
        req.session.flashMessage = errors[0];
        req.session.inputValues = req.body;
        req.session.save((err) => {
            if (err) {
                console.error(err);
            }

            return res.redirect('/register');
        });
    } else {
        User
            .findOne({ $or: [ { email }, { username } ] })
            .then((user) => {
                if (user) {
                    req.session.flashMessage = 'There is a user belonging to this information.';
                    req.session.inputValues = req.body;
                    req.session.save((err) => {
                        if (err) {
                            console.error(err);
                        }

                        return res.redirect('/register');
                    });
                } else {
                    bcrypt.hash(password, 10)
                        .then((hashed) => {
                            const newUser = new User({ username, email, password: hashed });
                            return newUser.save();
                        })
                        .then(() => res.redirect('/login'))
                        .catch((err) => console.error(err));
                }
            })
            .catch((err) => console.error(err));
    }
}
