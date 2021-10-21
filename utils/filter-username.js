module.exports = (username) => {
    username = username.trim();
    username = username.replace(/ +/, ' ');

    return username;
}