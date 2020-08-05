const schedule = require('node-schedule');

const {logger} = require('./../utils/winstonOptions');
const {getNthHourAfter} = require('./../utils/utils');
const {getCurrentDateTime, convertPersianDateToGregorian} = require('./../utils/utils');
const {sendPost, removePost} = require('./post-service');
const {bot} = require('./bot-service');
const {ScheduledTask} = require('./../model/scheduled-task');
const {PublishPostHistory} = require('./../model/publish-post-history');
const {AutoPostBasicInfo} = require('./../model/auto-post-basic-info');
const {Post} = require('./../model/post');
const {Constant} = require('./../service/categories-service');


let scheduledTasks = [];
let autoPostTaskMap = new Map();

let addScheduledTaskToAutoPostTaskMap = (channel, scheduledTask) => {
    let oldTask = autoPostTaskMap.get(channel.username);
    if (oldTask) {
        oldTask.active = false;
        oldTask.cancel();
        autoPostTaskMap.delete(oldTask);
    }
    autoPostTaskMap.set(channel.username, scheduledTask);
};

let scheduledRegisteredTask = (task) => {
    let startTime = new Date(convertPersianDateToGregorian(task.executeDateTime));
    let scheduledTask = schedule.scheduleJob(startTime, function () {
        executeScheduledTask(task).then(() => {
            logger.info(`Scheduled TASK HAS BEAN RUN ON ${task.executeDateTime}`);
        }).catch(e => {
            logger.error(`ERROR ON EXECUTE SCHEDULED TASK : ${e}`);
        });
    });
    scheduledTasks.push(scheduledTask);
};

let scheduledAutoPostBasicInfo = (basicInfo) => {
    let startTime = ` */${basicInfo.interval} * * * *`;
    let scheduledTask = schedule.scheduleJob(startTime, function () {
        executeAutoPost(basicInfo).then(() => {
            logger.info(`AUTO POST TASK HAS BEAN RUN ON ${getCurrentDateTime()}`);
        }).catch(e => {
            logger.error(`ERROR ON EXECUTE AUTO POST TASK : ${e}`);
        });
    });
    addScheduledTaskToAutoPostTaskMap(basicInfo.channel, scheduledTask);
};

let initAutoPostBasicInfo = async () => {
    try {
        let basicInfos = await AutoPostBasicInfo.loadBasicInfo();
        if (basicInfos.length !== 0) {
            basicInfos.forEach((basicInfo) => {
                scheduledAutoPostBasicInfo(basicInfo);
            });
        }
    } catch (e) {
        return Promise.reject(e);
    }
};


let initScheduledTask = async () => {
    try {
        let tasks = await ScheduledTask.loadAllRegisteredScheduledTask();
        if (tasks.length !== 0) {
            tasks.forEach((task) => {
                scheduledRegisteredTask(task);
            });
        }
    } catch (e) {
        return Promise.reject(e);
    }
};

let executeScheduledTask = async (task) => {
    try {
        await ScheduledTask.updateScheduledTaskStatus(task._id, Constant.RUNNING_SCHEDULED_TASK_STATUS);
        if (task.identifiers.length !== 0) {
            task.identifiers.forEach(async (identifier) => {
                await sendPost(task.user, identifier, task.silent);
                await ScheduledTask.updateScheduledTaskStatus(task._id, Constant.RAN_SCHEDULED_TASK_STATUS);
            })
        }
    } catch (e) {
        return Promise.reject(e);
    }
};

let executeAutoPost = async (basicInfo) => {
    try {
        if (basicInfo.active) {
            let favouritePosts = [];
            let normalPosts = [];
            if (basicInfo.numberOfFavouritePost > 0) {
                favouritePosts = await Post.searchForAutoPost(true, basicInfo.numberOfFavouritePost);
            }
            if (basicInfo.numberOfNormalPost > 0) {
                normalPosts = await Post.searchForAutoPost(false, basicInfo.numberOfNormalPost);
            }
            const posts = [...favouritePosts, ...normalPosts];
            if (posts.length !== 0) {
                posts.forEach(async (post) => {
                    if (post.publishHistory.length !== 0) {
                        post.publishHistory.forEach(async (publishPostHistory) => {
                            if (publishPostHistory.active && publishPostHistory.channel.equals(basicInfo.channel._id)) {
                                bot.deleteMessage(basicInfo.channel.username, publishPostHistory.identifier).then(async () => {
                                    await PublishPostHistory.makeDeActivePublishPostHistory(publishPostHistory._id);
                                }).catch(async (e) => {
                                    if (e.response !== undefined && e.response.body !== undefined && e.response.body.description === 'Bad Request: message to delete not found') {
                                        await PublishPostHistory.makeDeActivePublishPostHistory(publishPostHistory._id);
                                    } else {
                                        return Promise.reject(e);
                                    }
                                });
                            }
                        })
                    }
                    console.log("Start Posting with identifier " + post.identifier);
                    await sendPost(post.user, basicInfo.channel, post.identifier, basicInfo.silent);
                })
            }
        }
    } catch (e) {
        return Promise.reject(e);
    }
};


let findAndRemoveOldPost = async () => {
    let publishPostInfos = await PublishPostHistory.loadAllActivePostInfo();
    if (publishPostInfos !== undefined && publishPostInfos.length !== 0) {
        publishPostInfos.forEach(async (publishPostInfo) => {
            let dateTime = publishPostInfo.creationDateTime.persianDateTime;
            if (getCurrentDateTime() >= getNthHourAfter(dateTime, 36) || true) {
                let post = await Post.loadById(publishPostInfo.post);
                await removePost(post.user, post.identifier, Constant.REGISTERED_POST_STATUS, publishPostInfo.channel);
            }
        });
    }
};

let scheduleOldPostFinder = () => {
    let startTime = `* 3 * * *`;
    schedule.scheduleJob(startTime, function () {
        findAndRemoveOldPost().then(() => {
            logger.info(`OLD POST FINDER HAS BEAN RUN ON ${getCurrentDateTime()}`);
        }).catch(e => {
            logger.error(`ERROR ON EXECUTE OLD POST FINDER : ${e}`);
        });
    });
};

module.exports = {
    initAutoPostBasicInfo, initScheduledTask, scheduledAutoPostBasicInfo, scheduledRegisteredTask, scheduleOldPostFinder
};