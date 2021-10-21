const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const path = require('path');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const csurf = require('csurf');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const { createServer } = require('http');
const server = createServer(app);
const io = require('./lib/sockets')(server);
const { evaluate } = require('mathjs');
require('dotenv').config();

const adminRoutes = require('./routes/admin');
const userRoutes = require('./routes/user');
const guestRoutes = require('./routes/guest');

const errorController = require('./controllers/error');

const Server = require('./models/server');
const User = require('./models/user');
const Role = require('./models/role');

const store = new MongoDBStore({
    uri: process.env.CONNECTION_STRING,
    collection: 'sessions'
});

app.set('view engine', 'pug');
app.set('views', './views');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
    secret: process.env.SESSION_SECRET || 'socketio-chat',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: process.env.SESSION_AGE_SECONDS ? evaluate(process.env.SESSION_AGE_SECONDS) * 1000 : 0,
    },
    store,
}));
app.use(express.static(path.join(__dirname, 'public')));
app.use((req, res, next) => {
    Role
        .findOne({ defaultRole: true, name: 'everyone' })
        .then((role) => {
            if (role) {
                return true;
            }

            role = new Role({
                name: 'everyone',
                defaultRole: true,
                order: 0
            });

            return role.save();
        })
        .then(() => next())
        .catch((err) => console.error(err));
});
app.use((req, res, next) => {
    if (!req.session.user) {
        return next();
    }

    User.findById(req.session.user._id)
        .then((user) => {
            if (!user) {
                req.session.flashMessage = 'Your account has been deleted.';
                delete req.session.user;
                req.session.save((err) => {
                    if (err) {
                        console.error(err);
                    }
                });

                return next();
            }

            req.user = new User({
                _id: mongoose.Types.ObjectId(user._id),
                username: user.username,
                email: user.email,
                activated: user.activated,
                roles: user.roles,
                banned: user.banned,
                hasPermission: user.hasPermission,
                isAdmin: user.isAdmin,
                getPermissions: user.getPermissions,
                getHighestRole: user.getHighestRole,
            });

            next();
        })
        .catch((err) => console.error(err));
});
app.use((req, res, next) => {
    if (req.user && req.user.banned) {
        if (req.url !== '/banned') {
            return res.redirect('/banned');
        }
    }

    return next();
});
app.use(csurf({ cookie: false }));
app.use((err, req, res, next) => {
    if (err && err.code && err.code === 'EBADCSRFTOKEN') {
        res.status(403).render('error/error', {
            title: 'Invalid CSRF Token',
            code: 403,
            message: 'Form Tampered With'
        });
    } else {
        next();
    }
});
app.use((req, res, next) => {
    Server
        .findOne({})
        .then((server) => {
            if (server) {
                req.server = server;
                return next();
            }

            server = new Server({ _id: 1 });
            server.save();
            req.server = server;
            return next();
        })
        .catch((err) => console.error(err));
});

app.use('/admin', adminRoutes);
app.use(userRoutes);
app.use(guestRoutes);
app.use(errorController.get404Page);

mongoose.connect(process.env.CONNECTION_STRING)
    .then(() => {
        console.log('Connected to MongoDB');
        server.listen(process.env.PORT, () => {
            console.log(`Listening on port ${process.env.PORT} > http://localhost:${process.env.PORT}`);
        });
    })
    .catch((err) => console.error(err));
