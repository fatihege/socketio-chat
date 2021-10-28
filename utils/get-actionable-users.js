module.exports = (req, users, callback) => {
    req.user.getHighestRole()
        .then(async (authUserHighestRole) => {
            new Promise((resolve) => {
                let actionableUsers = [];
                let i = 0;
                users.map((u) => {
                    new Promise((resolve1) => {
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
                .then((actionableUsers) => callback(actionableUsers));
        })
        .catch((err) => console.error(err));
}