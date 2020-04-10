const _ = require('lodash');

const {mongoose} = require('../db/mongoose');
const {Account} = require('./account');

let UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        minlength: 3,
        trim: true
    },
    channelChatIdentifier: {
        type: String,
        required: true
    },
    adminChatIdentifier: {
        type: String,
        required: true
    },
    defaultAttributes: [
        {
            type: String,
            trim: true
        }
    ],
    accounts: [{type: mongoose.Schema.ObjectId, ref: 'Account'}]
});

UserSchema.methods.toJSON = function () {
    let user = this;
    let userObject = user.toObject();
    return _.pick(userObject, ['name']);
};


UserSchema.methods.updateUserDefaultAttributes = async function (defaultAttributes) {
    let user = this;
    try {
        user.defaultAttributes = defaultAttributes;
        await user.save();
        return Promise.resolve(defaultAttributes);
    } catch (e) {
        return Promise.reject(e);
    }
};


UserSchema.statics.findByAccount = function (account) {
    let User = this;
    return User.findOne({
        'accounts': mongoose.Types.ObjectId(account._id)
    });
};

UserSchema.statics.persist = async function (info) {
    let User = this;
    try {
        let accounts = await Account.persist(info.accounts);
        const userInfo = _.pick(info, ['name', 'channelChatIdentifier', 'adminChatIdentifier']);
        userInfo.accounts = accounts;

        let user = new User(userInfo);
        await user.save();
        return Promise.resolve(user);
    } catch (e) {
        return Promise.resolve(e);
    }
};

let User = mongoose.model('User', UserSchema);

module.exports = {
    User
};