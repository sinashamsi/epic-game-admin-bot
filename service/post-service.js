const {bot} = require('./bot-service');

const {Post} = require('./../model/post');
const {PublishPostHistory} = require('./../model/publish-post-history');
const {getCategoryElement, Constant} = require('./categories-service');


let sendPost = async (user, channel, identifier, silent) => {
    try {
        let post = await Post.findPost(user, identifier);
        if (post.status.name !== Constant.DELETED_POST_STATUS && channel.status.name === Constant.ACTIVE_CHANNEL_STATUS) {
            let postContent = preparePostContent(post);
            await bot.sendMessage(channel.username, postContent, {
                disable_notification: silent,
                parse_mode: 'html'
            }).then(async (result) => {
                if (result.message_id) {
                    let status = getCategoryElement(Constant.SENT_POST_STATUS);
                    await Post.updatePostStatus(post._id, status);
                    await post.addPublishPostHistory(result.message_id, channel);
                    return Promise.resolve(result);
                }
            }).catch((e) => {
                return Promise.reject(e);
            });
        } else {
            return Promise.reject("INVALID POST STATUS");
        }
    } catch (e) {
        return Promise.reject(e);
    }
};

let removePost = async (user, identifier, statusName, channel) => {
    try {
        let post = await Post.findPost(user, identifier);
        let status = getCategoryElement(statusName);
        await Post.updatePostStatus(post._id, status);
        if (post.publishHistory.length !== 0) {
            for (const publishHistory of post.publishHistory) {
                let publishPostHistory = await PublishPostHistory.loadById(publishHistory);
                if (publishPostHistory && publishPostHistory.active && (channel == undefined || channel.username === publishPostHistory.channel.username)) {
                    await bot.deleteMessage(publishPostHistory.channel.username, publishPostHistory.identifier).then(async () => {
                        await PublishPostHistory.makeDeActivePublishPostHistory(publishPostHistory._id);
                    }).catch(async e => {
                        if (e.response !== undefined && e.response.body !== undefined && e.response.body.description === 'Bad Request: message to delete not found') {
                            await PublishPostHistory.makeDeActivePublishPostHistory(publishPostHistory._id);
                        }
                    });
                }
            }
        }
        return Promise.resolve(post);
    } catch (e) {
        return Promise.reject(e);
    }
};


let prepareAndUpdatePostStatus = async (user, identifier) => {
    let post = await Post.findPost(user, identifier);
    if (post.publishHistory.length !== 0) {
        post.publishHistory.forEach(async (item) => {
            let publishPostHistory = await PublishPostHistory.loadById(item);
            if (publishPostHistory.active) {
                let status = getCategoryElement(Constant.SENT_POST_STATUS);
                await Post.updatePostStatus(post._id, status)
            }
        })
    }
};


let preparePostContent = (post) => {
    return '#EG' + post.identifier + '\n' + post.content + '\n' + '⚡️ID => @' + post.account.telegramUsername + ' ⚡️';
};

module.exports = {
    sendPost, removePost, preparePostContent, prepareAndUpdatePostStatus
};