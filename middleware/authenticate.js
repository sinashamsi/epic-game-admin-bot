const {Account} = require('./../model/account');
const {User} = require('./../model/user');
const {hasPermission} = require('./../service/roles-service');

let authenticate = (req, res, next) => {
    let token = req.header('x-auth');

    Account.findByToken(token).then(async (account) => {
        if (!account) {
            return Promise.reject();
        }
        if (hasPermission(req.url, account.roles)) {
            let user = await User.findByAccount(account);
            req.user = user;
            req.account = account;
            req.token = token;
            next();
        } else {
            res.status(403).send();
        }

    }).catch((err) => {
        res.status(401).send();
    });
};

module.exports = {
    authenticate
};