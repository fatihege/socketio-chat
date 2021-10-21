const { validPermissions } = require('../constants');

module.exports = (body) => {
    let permissions = [];

    Object.keys(validPermissions).map((vp, i) => {
        if (Boolean(body[vp.toLowerCase()])) {
            permissions.push(1);
        } else {
            permissions.push(0);
        }
    });

    return permissions.join('');
}
