const User = require('../models/user');
const { decrypt } = require('./hashing');

exports.findUserByHashedID = async (hashedID) => {
    const userID = decrypt(hashedID);

    try {
        const user = await User.findById(userID);

        if (user) {
            return user;
        } else {
            return null;
        }
    } catch (e) {
        console.error(e);
    }
}
