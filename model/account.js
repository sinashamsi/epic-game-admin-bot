const bcrypt = require('bcryptjs');
const _ = require('lodash');
const jwt = require('jsonwebtoken');
const config = require('config');
const generator = require('generate-password');

const {Constant} = require('../service/categories-service');
const {mongoose} = require('../db/mongoose');
const {getCurrentDateTimeJson} = require('./../utils/utils');


let AccountSchema = new mongoose.Schema({
    creationDateTime: {
        englishDateTime: {
            type: String,
            required: true,
            trim: true
        },
        persianDateTime: {
            type: String,
            required: true,
            trim: true
        }
    },
    lastUpdateDateTime: {
        englishDateTime: {
            type: String,
            required: true,
            trim: true
        },
        persianDateTime: {
            type: String,
            required: true,
            trim: true
        }
    },
    name: {
        type: String,
        required: true,
        minlength: 3,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    password: {
        type: String,
        required: true
    },
    telegramUsername: {
        type: String,
        required: true,
        trim: true
    },
    tokens: [{
        type: String,
        required: false
    }],
    roles: [{
        type: String,
        required: false
    }]
});

AccountSchema.methods.toJSON = function () {
    let account = this;
    let userObject = account.toObject();
    return _.pick(userObject, ['name', 'email', 'telegramUsername']);
};


AccountSchema.statics.findByCredentials = function (email, password) {
    let Account = this;

    return Account.findOne({email}).then((account) => {
        if (!account) {
            return Promise.reject("ایمیل نا معتبر می باشد");
        }
        return new Promise((resolve, reject) => {
            bcrypt.compare(password, account.password, (err, res) => {
                if (res) {
                    resolve(account);
                } else {
                    reject("کلمه عبور نا معتبر می باشد");
                }
            });
        });
    });
};

AccountSchema.statics.updateAccount = async function (newAccount, oldAccount) {
    let Account = this;

    oldAccount.name = newAccount.name;
    oldAccount.telegramUsername = newAccount.telegramUsername;

    if (newAccount.roles === undefined || newAccount.roles == null || newAccount.roles.length === 0) {
        oldAccount.roles = [Constant.USER_ROLE];
    } else {
        oldAccount.roles = newAccount.roles;
    }

    if (oldAccount.email !== newAccount.email) {
        let anotherAccount = await Account.findAccountByEmail(newAccount.email);
        if (!anotherAccount) {
            oldAccount.email = newAccount.email;
        } else {
            return Promise.reject("ایمیل تکراری است");
        }
    }

    if (newAccount.password) {
        if (newAccount.oldPassword) {
            await checkPassword(newAccount.oldPassword, oldAccount.password);
            oldAccount.password = newAccount.password;
        } else {
            return Promise.reject("کلمه عبور قبلی مقدار ندارد.");
        }
    }
    await oldAccount.save();
    return Promise.resolve(oldAccount);
};



AccountSchema.statics.findAccountByEmail = function (email) {
    let Account = this;
    try {
        return Account.findOne({email});
    } catch (e) {
        return Promise.reject(e);
    }
};


AccountSchema.statics.findByToken = function (token) {
    let Account = this;
    try {
        let decoded = jwt.verify(token, config.get('JWT_SECRET'));
        return Account.findOne({
            _id: decoded._id,
            tokens: token
        });
    } catch (e) {
        return Promise.reject();
    }
};

AccountSchema.statics.persist = async function (accountInfos) {
    let Account = this;
    let accounts = [];
    for (const accountInfo of accountInfos) {
        let oldAccount = await Account.findAccountByEmail(accountInfo.email);
        if (!oldAccount) {
            if (accountInfos.roles === undefined || accountInfos.roles == null || accountInfos.roles.length === 0) {
                accountInfos.roles = [Constant.USER_ROLE];
            }
            accountInfo.creationDateTime = getCurrentDateTimeJson();
            accountInfo.lastUpdateDateTime = getCurrentDateTimeJson();
            let account = new Account(accountInfo);
            await account.save();
            accounts.push(account._id);
        } else {
            return Promise.reject("ایمیل تکراری است");
        }
    }
    return Promise.resolve(accounts);
};

AccountSchema.statics.findAccountAndUpdatePassword = async function (email) {
    let Account = this;
    let account = await Account.findAccountByEmail(email);
    if (account) {
        let password = generator.generate({
            length: 10,
            numbers: true
        });
        account.password = password;
        await account.save();
        return password;
    } else {
        return Promise.reject("ایمیل اشتباه است");
    }
};



AccountSchema.statics.loadByMobileNumber = function (mobileNumber) {
    let Account = this;
    return Account.findOne({
        mobileNumber
    });
};


AccountSchema.methods.removeToken = function () {
    let account = this;
    return account.updateOne({tokens: []});
};

AccountSchema.methods.generateAuthToken = function () {
    let account = this;
    let token = jwt.sign({_id: account._id.toHexString()}, config.get('JWT_SECRET')).toString();
    account.tokens.push(token);
    return account.save().then(() => {
        return token;
    });
};

AccountSchema.pre('save', function (next) {
    let account = this;

    if (account.isModified('password')) {
        bcrypt.genSalt(10, (err, salt) => {
            bcrypt.hash(account.password, salt, (err, hash) => {
                account.password = hash;
                next();
            });
        });
    } else {
        next();
    }
});

let checkPassword = (password, hashedPassword) => {
    return new Promise((resolve, reject) => {
        bcrypt.compare(password, hashedPassword, (err, res) => {
            if (res) {
                resolve(password);
            } else {
                reject("کلمه عبور نا معتبر می باشد");
            }
        });
    });
};

let Account = mongoose.model('Account', AccountSchema);

module.exports = {
    Account
};