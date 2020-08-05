const _ = require('lodash');

const {mongoose} = require('../db/mongoose');
const {Account} = require('./account');
const {TelegramChannel} = require('./telegram-channel');
const {getCurrentDateTimeJson} = require('./../utils/utils');
const {getCategoryElement, Constant} = require('./../service/categories-service');


let UserSchema = new mongoose.Schema({
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
    channels: [{type: mongoose.Schema.ObjectId, ref: 'TelegramChannel'}],
    defaultAttributes: [
        {
            type: String,
            trim: true
        }
    ],
    accounts: [{type: mongoose.Schema.ObjectId, ref: 'Account'}] ,
    status: {
        name: {
            type: String,
            required: true,
            trim: true
        },
        persianName: {
            type: String,
            required: true,
            trim: true
        }
    }
});


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


UserSchema.methods.updateUserChannels = async function (newChannels) {
    let user = this;
    let channels = [];
    try {
        for (const newChannel of newChannels) {
            let channel = await TelegramChannel.updateChannel(newChannel);
            channels.push(channel);
        }
        user.channels = channels;
        await user.save();
        return Promise.resolve(channels);
    } catch (e) {
        return Promise.reject(e);
    }
};


UserSchema.statics.findByAccount = function (account) {
    let User = this;
    return User.findOne({
        'accounts': mongoose.Types.ObjectId(account._id)
    }).populate('channels');
};


UserSchema.statics.persist = async function (info) {
    let User = this;
    try {
        let accounts = await Account.persist(info.accounts);
        let channels = await TelegramChannel.persist(info.channels);
        info.accounts = accounts;
        info.channels = channels;
        info.creationDateTime = getCurrentDateTimeJson();
        info.lastUpdateDateTime = getCurrentDateTimeJson();
        info.status = getCategoryElement(Constant.REGISTERED_USER_STATUS);
        let user = new User(info);
        await user.save();
        await TelegramChannel.updateChannelUser(info.channels, user);
        return Promise.resolve(info);
    } catch (e) {
        return Promise.reject(e);
    }
};

let User = mongoose.model('User', UserSchema);

module.exports = {
    User
};