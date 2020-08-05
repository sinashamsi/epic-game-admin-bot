const {TelegramChannel} = require('./../model/telegram-channel');

let loadChannels = async (user, channelInfos) => {
    try {
        let channels = [];
        if (channelInfos !== undefined && channelInfos.length !== 0) {
            for (const channelInfo of channelInfos) {
                let channel = await loadChannel(user, channelInfo.username);
                channels.push(channel._id);
            }
        }
        return Promise.resolve(channels)
    } catch (e) {
        return Promise.reject(e)
    }
};

let loadChannel = async (user, username) => {
    try {
        let channel = await TelegramChannel.findChannel(user, username);
        return Promise.resolve(channel)
    } catch (e) {
        return Promise.reject(e)
    }
};


module.exports = {
    loadChannel, loadChannels
};