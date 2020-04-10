const {Constant} = require('./categories-service');

const urlRoles = [
    {
        url: '/api/register-user',
        roles: [Constant.ADMIN_ROLE]
    }
];


let hasPermission = (requestUrl, accountRoles) => {
    let has = true;
    urlRoles.forEach((roleInfo) => {
        if (roleInfo.url === requestUrl) {
            if (accountRoles === undefined || accountRoles == null || accountRoles.length === 0) {
                has = false;
            } else {
                has = false;
                roleInfo.roles.forEach((role) => {
                    accountRoles.forEach((accountRole) => {
                        if (accountRole === role) {
                            has = true;
                        }
                    });
                });
            }
        }

    });
    return has;
};


module.exports = {
    hasPermission
};