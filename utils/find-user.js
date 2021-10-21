const User = require('../models/user');
const { decrypt } = require('./hashing');

exports.checkBannedUser = (user) => {
    if (!user) return false;

    if (user.banned) return true;
    else return false;
}

exports.findUserByHashedID = async (hashedID) => {
    const userID = decrypt(hashedID);

    try {
        const user = await User.findOne({ _id: userID, activated: true });

        if (user) {
            return user;
        } else {
            return null;
        }
    } catch (e) {
        console.error(e);
    }
}
