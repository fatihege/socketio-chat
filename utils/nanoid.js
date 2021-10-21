const { customAlphabet } = require('nanoid');
module.exports = (alphabet) => {
    const nanoid = customAlphabet(alphabet || '1234567890', 18);
    return nanoid;
}