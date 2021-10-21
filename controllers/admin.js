const bcrypt = require('bcryptjs');
const { evaluate } = require('mathjs');
const User = require('../models/user');
const Role = require('../models/role');
const validatePost = require('../utils/validate-post');
const filterUsername = require('../utils/filter-username');
const createRolePerms = require('../utils/create-role-perms');
const { validPermissions } = require('../constants');
require('dotenv').config();

const maxRoleCount = evaluate(process.env.MAX_ROLE_COUNT) || 50;

exports.getPanel = async (req, res, next) => {
    const userPermissions = await req.user.getPermissions();
    if (await userPermissions[validPermissions.MANAGE_SERVER]) return res.redirect('/admin/settings');
    else if (await userPermissions[validPermissions.MANAGE_ROOMS]) return res.redirect('/admin/rooms');
    else if (await userPermissions[validPermissions.MANAGE_USERS]) return res.redirect('/admin/users');
    else if (await userPermissions[validPermissions.BAN_USERS]) return res.redirect('/admin/bans');
    else if (await userPermissions[validPermissions.REGISTER_USER]) return res.redirect('/admin/register-user');
    else if (await userPermissions[validPermissions.MANAGE_ROLES]) return res.redirect('/admin/roles');
    else if (await userPermissions[validPermissions.MANAGE_MESSAGES]) return res.redirect('/admin/messages');
    else res.redirect('/');
}

exports.getSettings = async (req, res, next) => {
    const userPermissions = await req.user.getPermissions();
    const successMessage = req.session.successMessage;
    delete req.session.successMessage;

    res.render('admin/settings', {
        title: 'Server Settings',
        path: '/settings',
        server: req.server,
        counts: req.counts,
        validPermissions,
        userPermissions,
        successMessage,
    });
}

exports.postSettings = (req, res, next) => {
    const registrable = req.body.registrable;
    const loginOnlyAdmins = req.body.login_only_admins;
    req.server.registrable = registrable === 'on';
    req.server.loginOnlyAdmins = loginOnlyAdmins === 'on';
    req.server.save()
        .then(() => {
            req.session.successMessage = 'Settings saved successfully.';
            req.session.save((err) => {
                if (err) {
                    console.error(err);
                }

                return res.redirect('/admin/settings');
            });
        })
        .catch((err) => console.error(err));
}

exports.getRegisterUser = async (req, res, next) => {
    const userPermissions = await req.user.getPermissions();
    const successMessage = req.session.successMessage;
    const flashMessage = req.session.flashMessage;
    const inputValues = req.session.inputValues;
    delete req.session.successMessage;
    delete req.session.flashMessage;
    delete req.session.inputValues;

    res.render('admin/register-user', {
        title: 'Register User',
        path: '/register-user',
        server: req.server,
        counts: req.counts,
        validPermissions,
        userPermissions,
        successMessage,
        flashMessage,
        inputValues,
    });
}

exports.postRegisterUser = (req, res, next) => {
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
            min: 3
        }
    });

    const username = filterUsername(req.body.username);
    const email = req.body.email;
    const password = req.body.password;

    if (errors) {
        req.session.flashMessage = errors[0];
        req.session.inputValues = req.body;
        req.session.save((err) => {
            if (err) {
                console.error(err);
            }

            return res.redirect('/admin/register-user');
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

                        return res.redirect('/admin/register-user');
                    });
                } else {
                    bcrypt.hash(password + process.env.HASH_SALT_TEXT, 10)
                        .then((hashed) => new User({ username, email, password: hashed, activated: true }))
                        .then((newUser) => {
                            return Role.find({ defaultRole: true })
                                .then((roles) => {
                                    if (!roles.length) {
                                        return newUser.save();
                                    }

                                    newUser.roles = roles;
                                    newUser.save();
                                })
                                .catch((err) => console.error(err));
                        })
                        .then(() => {
                            req.session.successMessage = 'User has been successfully created.'
                            req.session.save((err) => {
                                if (err) {
                                    console.error(err);
                                }

                                return res.redirect('/admin/register-user');
                            });
                        })
                        .catch((err) => console.error(err));
                }
            })
            .catch((err) => console.error(err));
    }
}

exports.getRoleByID = async (req, res, next) => {
    const userPermissions = await req.user.getPermissions();

    Role
        .findById(req.params.id)
        .then((role) => {
            if (!role) return res.redirect('/admin/roles');

            res.render('admin/role/edit', {
                title: `Edit Role - ${role.name}`,
                path: '/roles',
                server: req.server,
                counts: req.counts,
                validPermissions,
                userPermissions,
                role,
            });
        })
        .catch((err) => console.error(err));
}

exports.getRoles = async (req, res, next) => {
    const userPermissions = await req.user.getPermissions();
    const successMessage = req.session.successMessage;
    const flashMessage = req.session.flashMessage;
    delete req.session.successMessage;
    delete req.session.flashMessage;

    Role
        .find()
        .sort({ defaultRole: -1, order: 1 })
        .then((roles) => {
            const roleCount = roles.filter((r) => !r.defaultRole).length;

            res.render('admin/roles', {
                title: 'Roles',
                path: '/roles',
                server: req.server,
                counts: req.counts,
                validPermissions,
                userPermissions,
                successMessage,
                flashMessage,
                roles,
                maxRoleCount: roleCount >= maxRoleCount,
            });
        })
        .catch((err) => console.error(err));
}

exports.getCreateRole = async (req, res, next) => {
    const userPermissions = await req.user.getPermissions();
    const successMessage = req.session.successMessage;
    const flashMessage = req.session.flashMessage;
    const inputValues = req.session.inputValues;
    delete req.session.successMessage;
    delete req.session.flashMessage;
    delete req.session.inputValues;

    Role
        .count({ defaultRole: false })
        .then((count) => {
            res.render('admin/role/create', {
                title: 'Create Role',
                path: '/roles',
                server: req.server,
                counts: req.counts,
                validPermissions,
                userPermissions,
                successMessage,
                flashMessage,
                inputValues,
                maxRoleCount: count >= maxRoleCount,
            });
        })
        .catch((err) => console.error(err));
}

exports.postCreateRole = async (req, res, next) => {
    await Promise.all([
        async function () {
            Role
                .count({ defaultRole: false })
                .then((count) => {
                    if (count >= maxRoleCount) {
                        return res.redirect('/admin/roles');
                    }
                })
                .catch((err) => console.error(err))
        }
    ]);

    const errors = validatePost(req.body, {
        name: {
            name: 'Name',
            required: true,
            trim: true,
            min: 1,
            max: 25
        },
    });

    const name = filterUsername(req.body.name);
    const color = req.body.color.trim().length ? req.body.color.trim() : 'ffffff';

    if (errors) {
        req.session.flashMessage = errors[0];
        req.session.inputValues = req.body;
        req.session.save((err) => {
            if (err) {
                console.error(err);
            }

            return res.redirect('/admin/roles/create');
        });
    } else {
        Role
            .find()
            .sort({ order: -1 })
            .limit(1)
            .then((findRole) => {
                const role = new Role({
                    name,
                    color,
                    order: findRole.length ? findRole[0].order + 1 : 0,
                    permissions: createRolePerms(req.body)
                });

                return role.save();
            })
            .then(() => {
                req.session.successMessage = 'Role has been successfully created';
                req.session.save((err) => {
                    if (err) {
                        console.error(err);
                    }

                    return res.redirect('/admin/roles');
                })
            })
            .catch((err) => console.error(err));
    }
}

exports.postDeleteRole = async (req, res, next) => {
    const errors = validatePost(req.body, {
        id: {
            name: 'ID',
            required: true
        },
    });

    if (errors) {
        req.session.flashMessage = errors[0];
        req.session.save((err) => {
            if (err) {
                console.error(err);
            }

            return res.redirect('/admin/roles');
        });
    }

    const id = req.body.id;

    User
        .find({ roles: { $in: [id] } })
        .then(async (users) => {
            await Promise.all(users.map((u) => {
                u.roles = u.roles.filter((r) => r._id.toString() !== id.toString());
                u.save();
            }));

            return Role.findOne({ _id: id });
        })
        .then((role) => {
            if (!role) return res.redirect('/admin/roles');

            Role.deleteOne({ _id: id })
                .then(() => {
                    req.session.successMessage = 'The role has been successfully deleted.';
                    req.session.save((err) => {
                        if (err) {
                            console.error(err);
                        }

                        return res.redirect('/admin/roles');
                    });
                })
                .catch((err) => console.error(err));
        })
        .catch((err) => console.error(err));
}

exports.postEditRole = async (req, res, next) => {
    const errors = validatePost(req.body, {
        _id: {
            name: 'ID',
            required: true
        },
        name: {
            name: 'Name',
            required: true,
            trim: true,
            min: 1,
            max: 25
        },
    });

    const id = req.body._id;
    const name = filterUsername(req.body.name);
    const color = req.body.color.trim().length ? req.body.color.trim() : 'ffffff';

    if (errors) {
        req.session.flashMessage = errors[0];
        req.session.save((err) => {
            if (err) {
                console.error(err);
            }

            return res.redirect(`/admin/roles/${id}`);
        });
    } else {
        Role
            .findById(id)
            .then((role) => {
                if (!role) {
                    req.session.flashMessage = 'Role not found';
                    req.session.save((err) => {
                        if (err) {
                            console.error(err);
                        }

                        return res.redirect('/admin/roles');
                    });
                }

                role.name = name;
                role.color = color;
                role.permissions = createRolePerms(req.body);

                return Role.updateOne(
                    { _id: id },
                    { $set: { name: role.name, color: role.color, permissions: role.permissions } }
                );
            })
            .then(() => {
                req.session.successMessage = 'Role has been successfully updated';
                req.session.save((err) => {
                    if (err) {
                        console.error(err);
                    }

                    return res.redirect('/admin/roles');
                })
            })
            .catch((err) => console.error(err));
    }
}

exports.getPendingUsers = async (req, res, next) => {
    const userPermissions = await req.user.getPermissions();
    const successMessage = req.session.successMessage;
    const flashMessage = req.session.flashMessage;
    delete req.session.successMessage;
    delete req.session.flashMessage;

    User
        .find({ activated: false })
        .sort({ createdAt: 1 })
        .then((users) => {
            res.render('admin/pending-users', {
                title: 'Pending Users',
                path: '/pending-users',
                server: req.server,
                counts: req.counts,
                validPermissions,
                userPermissions,
                successMessage,
                flashMessage,
                users,
            });
        })
        .catch((err) => console.error(err));
}

exports.postActivateUser = async (req, res, next) => {
    const errors = validatePost(req.body, {
        id: {
            name: 'ID',
            required: true
        },
    });

    const id = req.body.id;

    if (errors) {
        req.session.flashMessage = errors[0];
        req.session.save((err) => {
            if (err) {
                console.error(err);
            }

            return res.redirect('/admin/pending-users');
        });
    } else {
        User
            .findOne({ _id: id, activated: false })
            .then((user) => {
                if (!user) return res.redirect('/admin/pending-users');

                user.activated = true;

                return User.updateOne(
                    { _id: id },
                    { $set: { activated: user.activated } }
                );
            })
            .then(() => {
                req.session.successMessage = 'User has been successfully activated';
                req.session.save((err) => {
                    if (err) {
                        console.error(err);
                    }

                    return res.redirect('/admin/pending-users');
                })
            })
            .catch((err) => console.error(err));
    }
}

exports.postDeactivateUser = async (req, res, next) => {
    const errors = validatePost(req.body, {
        id: {
            name: 'ID',
            required: true
        },
    });

    const id = req.body.id;

    if (errors) {
        req.session.flashMessage = errors[0];
        req.session.save((err) => {
            if (err) {
                console.error(err);
            }

            return res.redirect('/admin/users');
        });
    } else {
        User
            .findOne({ _id: id, activated: true })
            .then((user) => {
                if (!user) return res.redirect('/admin/users');

                user.activated = false;

                return User.updateOne(
                    { _id: id },
                    { $set: { activated: user.activated } }
                );
            })
            .then(() => {
                req.session.successMessage = 'User has been successfully deactivated';
                req.session.save((err) => {
                    if (err) {
                        console.error(err);
                    }

                    return res.redirect('/admin/users');
                })
            })
            .catch((err) => console.error(err));
    }
}

exports.postDeleteUser = async (req, res, next) => {
    const errors = validatePost(req.body, {
        id: {
            name: 'ID',
            required: true
        },
    });

    if (errors) {
        req.session.flashMessage = errors[0];
        req.session.save((err) => {
            if (err) {
                console.error(err);
            }

            return res.redirect('/admin/users');
        });
    }

    const id = req.body.id;

    User
        .findById(id)
        .then((user) => {
            if (!user) return res.redirect('/admin/users');

            User.deleteOne({ _id: id })
                .then(() => {
                    req.session.successMessage = 'The user has been successfully deleted.';
                    req.session.save((err) => {
                        if (err) {
                            console.error(err);
                        }

                        return res.redirect('/admin/users');
                    });
                })
                .catch((err) => console.error(err));
        })
        .catch((err) => console.error(err));
}

exports.getUsers = async (req, res, next) => {
    const userPermissions = await req.user.getPermissions();
    const successMessage = req.session.successMessage;
    const flashMessage = req.session.flashMessage;
    delete req.session.successMessage;
    delete req.session.flashMessage;

    User
        .find({ activated: true })
        .sort({ createdAt: 1 })
        .then(async (users) => {
            req.user.getHighestRole()
                .then(async (authUserHighestRole) => {
                    new Promise((resolve, reject) => {
                        let actionableUsers = [];
                        let i = 0;
                        users.map((u) => {
                            new Promise((resolve1, reject1) => {
                                return resolve1(u.getHighestRole());
                            })
                                .then((userHighestRole) => {
                                    if (authUserHighestRole.order < (userHighestRole ? userHighestRole.order : authUserHighestRole.order + 1)) {
                                        actionableUsers.push(u);
                                    }

                                    i++;

                                    if (i === users.length) {
                                        return resolve(actionableUsers);
                                    }
                                });
                        });
                    })
                        .then((actionableUsers) => {
                            res.render('admin/users', {
                                title: 'Users',
                                path: '/users',
                                server: req.server,
                                counts: req.counts,
                                validPermissions,
                                userPermissions,
                                successMessage,
                                flashMessage,
                                users,
                                actionableUsers,
                                authUser: req.user,
                            });
                        });
                })
                .catch((err) => console.error(err));
        })
        .catch((err) => console.error(err));
}

exports.getUserByID = async (req, res, next) => {
    const userPermissions = await req.user.getPermissions();

    User
        .findById(req.params.id)
        .populate('roles')
        .then((user) => {
            if (!user) return res.redirect('/admin/users');

            Role
                .find({ defaultRole: false })
                .then((roles) => {
                    res.render('admin/user/edit', {
                        title: `Edit User - ${user.username}`,
                        path: '/users',
                        server: req.server,
                        counts: req.counts,
                        validPermissions,
                        userPermissions,
                        user,
                        roles,
                    });
                })
                .catch((err) => console.error(err));
        })
        .catch((err) => console.error(err));
}

exports.postEditUser = async (req, res, next) => {
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
    });

    const id = req.body._id;
    const username = filterUsername(req.body.username);
    const email = req.body.email;
    const roles = req.body.role || {};

    if (errors) {
        req.session.flashMessage = errors[0];
        req.session.save((err) => {
            if (err) {
                console.error(err);
            }

            return res.redirect(`/admin/users/${id}`);
        });
    } else {
        User
            .findOne({ _id: id, activated: true })
            .then((user) => {
                if (!user) {
                    req.session.flashMessage = 'User not found';
                    req.session.save((err) => {
                        if (err) {
                            console.error(err);
                        }

                        return res.redirect('/admin/users');
                    });
                }

                Object.keys(roles).map((r) => {
                    if (!user.roles.find((r1) => r1._id.toString() === r)) user.roles.push(r);
                });
                user.username = username;
                user.email = email;

                return User.updateOne(
                    { _id: id },
                    { $set: { username: user.username, email: user.email, roles: user.roles } }
                );
            })
            .then(() => {
                req.session.successMessage = 'User has been successfully updated';
                req.session.save((err) => {
                    if (err) {
                        console.error(err);
                    }

                    return res.redirect('/admin/users');
                })
            })
            .catch((err) => console.error(err));
    }
}

exports.postBanUser = async (req, res, next) => {
    const errors = validatePost(req.body, {
        id: {
            name: 'ID',
            required: true
        },
    });

    const id = req.body.id;

    if (errors) {
        req.session.flashMessage = errors[0];
        req.session.save((err) => {
            if (err) {
                console.error(err);
            }

            return res.redirect(`/admin/users`);
        });
    } else {
        User
            .findOne({ _id: id, activated: true, banned: false })
            .then((user) => {
                if (!user) {
                    req.session.flashMessage = 'User not found';
                    req.session.save((err) => {
                        if (err) {
                            console.error(err);
                        }

                        return res.redirect('/admin/users');
                    });
                }

                user.banned = true;

                return User.updateOne(
                    { _id: id },
                    { $set: { banned: user.banned } }
                );
            })
            .then(() => {
                req.session.successMessage = 'User has been successfully banned';
                req.session.save((err) => {
                    if (err) {
                        console.error(err);
                    }

                    return res.redirect('/admin/users');
                })
            })
            .catch((err) => console.error(err));
    }
}

exports.postUnbanUser = async (req, res, next) => {
    const errors = validatePost(req.body, {
        id: {
            name: 'ID',
            required: true
        },
    });

    const id = req.body.id;

    if (errors) {
        req.session.flashMessage = errors[0];
        req.session.save((err) => {
            if (err) {
                console.error(err);
            }

            return res.redirect(`/admin/users`);
        });
    } else {
        User
            .findOne({ _id: id, activated: true, banned: true })
            .then((user) => {
                if (!user) {
                    req.session.flashMessage = 'User not found';
                    req.session.save((err) => {
                        if (err) {
                            console.error(err);
                        }

                        return res.redirect('/admin/users');
                    });
                }

                user.banned = false;

                return User.updateOne(
                    { _id: id },
                    { $set: { banned: user.banned } }
                );
            })
            .then(() => {
                req.session.successMessage = 'User has been successfully unbanned';
                req.session.save((err) => {
                    if (err) {
                        console.error(err);
                    }

                    return res.redirect('/admin/users');
                })
            })
            .catch((err) => console.error(err));
    }
}
