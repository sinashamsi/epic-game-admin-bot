const {mongoose} = require('../db/mongoose');
const {getCurrentDateTimeJson} = require('./../utils/utils');
const {getCategoryElement, Constant} = require('./../service/categories-service');

let TelegramChannelSchema = new mongoose.Schema({
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
    user: {type: mongoose.Schema.ObjectId, ref: 'User'},
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    name: {
        type: String,
        required: true,
        trim: true,
    },
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


TelegramChannelSchema.statics.findChannel = function (user, username) {
    let TelegramChannel = this;
    return TelegramChannel.findOne({username, user}).then((channel) => {
        if (!channel) {
            return Promise.reject("INVALID IDENTIFIER");
        } else {
            return Promise.resolve(channel);
        }
    });
};

TelegramChannelSchema.statics.findAccountByUsername= function (username) {
    let TelegramChannelSchema = this;
    try {
        return TelegramChannelSchema.findOne({username});
    } catch (e) {
        return Promise.reject(e);
    }
};

TelegramChannelSchema.statics.persist = async function (channelInfos) {
    let TelegramChannel = this;
    let channels = [];
    for (const channelInfo of channelInfos) {
        let channel = await TelegramChannel.persistChannel(channelInfo);
        channels.push(channel._id);
    }
    return channels;
};

TelegramChannelSchema.statics.persistChannel = async function (channelInfo) {
    let TelegramChannel = this;
    let oldChannel = await TelegramChannel.findAccountByUsername(channelInfo.username);
    if (!oldChannel) {
        channelInfo.creationDateTime = getCurrentDateTimeJson();
        channelInfo.lastUpdateDateTime = getCurrentDateTimeJson();
        if (channelInfo.statusCode) {
            channelInfo.status = getCategoryElement(channelInfo.statusCode);
        } else {
            channelInfo.status = getCategoryElement(Constant.ACTIVE_CHANNEL_STATUS);
        }
        let channel = new TelegramChannel(channelInfo);
        await channel.save();
        return channel._id;
    } else {
        return Promise.reject("نام کاربری کانال تکراری است");
    }
};

TelegramChannelSchema.statics.updateChannel = async function (channelInfo) {
    let TelegramChannel = this;
    let oldChannel = await TelegramChannel.findAccountByUsername(channelInfo.username);
    if (oldChannel) {
        oldChannel.lastUpdateDateTime = getCurrentDateTimeJson();
        oldChannel.name = channelInfo.name;
        oldChannel.status = getCategoryElement(channelInfo.statusCode);
        await oldChannel.save();
        return oldChannel._id;
    } else {
        let newChannel = await TelegramChannel.persistChannel(channelInfo);
        return newChannel._id;
    }
};

TelegramChannelSchema.statics.updateChannelUser = async function (channels, user) {
    let TelegramChannel = this;
    for (const channelId of channels) {
        await TelegramChannel.update({_id: channelId}, {
            $set: {
                user: user,
                lastUpdateDateTime: getCurrentDateTimeJson()
            }
        });
    }
};

let TelegramChannel = mongoose.model('TelegramChannel', TelegramChannelSchema);

module.exports = {
    TelegramChannel
};