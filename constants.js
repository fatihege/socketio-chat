const validPermissions = {
    ADMINISTRATOR: 'ADMINISTRATOR',
    VIEW_ROOMS: 'VIEW_ROOMS',
    SEND_MESSAGES: 'SEND_MESSAGES',
    SEE_MESSAGE_HISTORY: 'SEE_MESSAGE_HISTORY',
    MENTION_EVERYONE: 'MENTION_EVERYONE',
    BAN_USERS: 'BAN_USERS',
    MANAGE_MESSAGES: 'MANAGE_MESSAGES',
    MANAGE_ROOMS: 'MANAGE_ROOMS',
    MANAGE_SERVER: 'MANAGE_SERVER',
    MANAGE_ROLES: 'MANAGE_ROLES',
    MANAGE_USERS: 'MANAGE_USERS',
    REGISTER_USER: 'REGISTER_USER',
    DELETE_USERS: 'DELETE_USERS',
    EDIT_USERS: 'EDIT_USERS',
};

exports.validPermissions = validPermissions;

exports.permissions = [
    validPermissions.ADMINISTRATOR,
    validPermissions.VIEW_ROOMS,
    validPermissions.SEND_MESSAGES,
    validPermissions.SEE_MESSAGE_HISTORY,
    validPermissions.MENTION_EVERYONE,
    validPermissions.BAN_USERS,
    validPermissions.MANAGE_MESSAGES,
    validPermissions.MANAGE_ROOMS,
    validPermissions.MANAGE_SERVER,
    validPermissions.MANAGE_ROLES,
    validPermissions.MANAGE_USERS,
    validPermissions.REGISTER_USER,
    validPermissions.DELETE_USERS,
    validPermissions.EDIT_USERS,
];

exports.adminPermissions = [
    validPermissions.ADMINISTRATOR,
    validPermissions.BAN_USERS,
    validPermissions.MANAGE_MESSAGES,
    validPermissions.MANAGE_ROOMS,
    validPermissions.MANAGE_SERVER,
    validPermissions.MANAGE_ROLES,
    validPermissions.MANAGE_USERS,
    validPermissions.REGISTER_USER,
    validPermissions.DELETE_USERS,
    validPermissions.EDIT_USERS,
];

exports.defaultPermissions = '01111000000000';
