const bcrypt = require('bcryptjs');
const _ = require('lodash');
const jwt = require('jsonwebtoken');
const config = require('config');

const {Constant} = require('../service/categories-service');
const {mongoose} = require('../db/mongoose');

let AccountSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        minlength: 3,
        trim: true
    },
    mobileNumber: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    password: {
        type: String,
        minlength: 6,
        required: true
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
    return _.pick(userObject, ['name', 'username']);
};


AccountSchema.statics.findByCredentials = function (username, password) {
    let Account = this;

    return Account.findOne({username}).then((account) => {
        if (!account) {
            return Promise.reject("کد کاربری نا معتبر می باشد");
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
        if (accountInfos.roles === undefined || accountInfos.roles == null || accountInfos.roles.length === 0) {
            accountInfos.roles = [Constant.USER_ROLE];
        }
        let account = new Account(accountInfo);
        await account.save();
        accounts.push(account);
    }
    return accounts;
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

let Account = mongoose.model('Account', AccountSchema);

module.exports = {
    Account
};