const crypto = require('crypto');
require('dotenv').config();

exports.encrypt = (data) => {
    const cipher = crypto.createCipher('aes-128-cbc', process.env.HASH_SALT_TEXT);
    let result = cipher.update(data, 'utf8', 'hex')
    result += cipher.final('hex');

    return result;
}

exports.decrypt = (data) => {
    const cipher = crypto.createDecipher('aes-128-cbc', process.env.HASH_SALT_TEXT);
    let result = cipher.update(data, 'hex', 'utf8')
    result += cipher.final('utf8');

    return result;
}
