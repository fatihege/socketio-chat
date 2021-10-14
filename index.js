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
require('dotenv').config();

const userRoutes = require('./routes/user');
const guestRoutes = require('./routes/guest');

const errorController = require('./controllers/error');

const User = require('./models/user');

const store = new MongoDBStore({
    uri: process.env.CONNECTION_STRING,
    collection: 'sessions'
});

app.set('view engine', 'pug');
app.set('views', './views');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(session({
    secret: 'socketio-chat',
    resave: false,
    saveUninitialized: false,
    cookie: {
        // maxAge: 3600000 * 24 * 30
    },
    store
}));
app.use(express.static(path.join(__dirname, 'public')));
app.use((req, res, next) => {
    if (!req.session.user) {
        return next();
    }

    User.findById(req.session.user._id)
        .then((user) => {
            if (!user) {
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
                activated: user.activated
            });

            next();
        })
        .catch((err) => console.error(err));
});
app.use(csurf({ cookie: false }));

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
