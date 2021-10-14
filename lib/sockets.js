const User = require('../models/user');
const Message = require('../models/message');
const { findUserByHashedID } = require('../utils/find-user');
const { encrypt } = require('../utils/hashing');
const filterMessage = require('../utils/filter-message');
let sockets = {};
let usersTyping = [];

module.exports = (server) => {
    const io = require('socket.io')(server);

    io.on('connection', (socket) => {
        socket.on('error', (err) => {
            if (err && err.message === 'unauthorized event') {
                socket.disconnect();
            }
        });
    });

    io.on('connect', async (socket) => {
        socket.emit('connect first');

        socket.on('disconnect', async () => {
            let user = sockets[socket.id];
            if (!user) return;

            User.findById(user._id)
                .then((user) => {
                    if (!user) return;

                    user.status = 'offline';
                    return user.save();
                })
                .catch((err) => console.error(err));

            user = JSON.parse(JSON.stringify(user));
            user._id = encrypt(user._id.toString());
            delete user.password;
            delete user.status;
            io.emit('user offline', user);
        });

        socket.on('save user', async (hashedUserID) => {
            const user = await findUserByHashedID(hashedUserID);
            if (!user) return;

            for (let [k, v] of Object.entries(sockets)) {
                if (v._id.toString() === user._id.toString()) {
                    delete sockets[k];
                }
            }

            sockets[socket.id] = user;

            let users = await User.find().select('username email status').limit(200);

            users = users.map((u) => {
                if (u._id.toString() === user._id.toString()) {
                    u.status = 'online';
                    u.save();
                }

                if (!Object.values(sockets).find((s) => s._id.toString() === u._id.toString())) {
                    u.status = 'offline';
                    u.save();
                }

                u = JSON.parse(JSON.stringify(u));
                u._id = encrypt(u._id.toString());
                return u;
            });

            socket.emit('load users', users);

            let newUser = JSON.parse(JSON.stringify(user));
            newUser._id = encrypt(newUser._id.toString());
            delete newUser.password;
            delete newUser.status;
            io.emit('user online', newUser);
        });

        let messages = JSON.parse(JSON.stringify(await Message.find().sort({ createdAt: -1 }).populate('user reply')));
        messages.map(async (m) => {
            if (m.reply) {
                m.reply = JSON.parse(JSON.stringify(m.reply));
                const replyMessageUser = await User.findById(m.reply.user);

                if (replyMessageUser) {
                    m.reply.user = JSON.parse(JSON.stringify(replyMessageUser));
                    m.reply.user._id = encrypt(m.reply.user._id);
                    delete m.reply.user.password;
                    delete m.reply.user.status;
                }
            }
            m.user._id = encrypt(m.user._id.toString());
            delete m.user.password;
            delete m.user.status;
        });
        setTimeout(() => socket.emit('load messages', messages), 20);

        socket.on('send message', async (hashedUserID, messageContent, replyID) => {
            const user = await findUserByHashedID(hashedUserID);
            if (!user) return;

            const content = filterMessage(messageContent);
            if (!content.length) return;

            const message = new Message({
                content,
                user: user._id
            });

            if (replyID) {
                message.reply = replyID;
            }

            message.save()
                .then(async () => {
                    let msg = JSON.parse(JSON.stringify(await Message.findById(message._id).populate('user reply')));
                    msg.user._id = encrypt(msg.user._id.toString());
                    if (msg.reply) {
                        msg.reply = JSON.parse(JSON.stringify(msg.reply));
                        const replyMessageUser = await User.findById(msg.reply.user);

                        if (replyMessageUser) {
                            msg.reply.user = JSON.parse(JSON.stringify(replyMessageUser));
                            msg.reply.user._id = encrypt(msg.reply.user._id);
                            delete msg.reply.user.password;
                            delete msg.reply.user.status;
                        }
                    }
                    delete msg.user.password;
                    delete msg.user.status;

                    io.emit('add message', msg);
                })
                .catch((err) => console.error(err));
        });

        socket.on('user started typing', async (hashedUserID) => {
            let user = JSON.parse(JSON.stringify(await findUserByHashedID(hashedUserID)));
            user._id = encrypt(user._id.toString());
            delete user.password;
            delete user.status;
            let contains = usersTyping.find((u) => u._id.toString() === user._id.toString());

            if (!contains) {
                usersTyping.push(user);

                io.emit('load users typing', usersTyping);
            }
        });

        socket.on('user stopped typing', async (hashedUserID) => {
            usersTyping = usersTyping.filter((u) => u._id.toString() !== hashedUserID);
            io.emit('load users typing', usersTyping);
        });
    });

    return io;
}
