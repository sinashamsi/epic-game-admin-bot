const TelegramBot = require('node-telegram-bot-api');
const config = require('config');
const express = require('express');
const helmet = require('helmet');
const _ = require('lodash');
const Joi = require('joi');
const bodyParser = require('body-parser');
const cors = require('cors');
const schedule = require('node-schedule');

const {User} = require('./model/user');
const {Post} = require('./model/post');
const {ScheduledTask} = require('./model/scheduled-task');
const {PublishPostHistory} = require('./model/publish-post-history');
const {AutoPostBasicInfo} = require('./model/auto-post-basic-info');
const {Education} = require('./model/education');
const {authenticate} = require('./middleware/authenticate');
const {handleResponse, getCurrentDateTime, convertPersianDateToGregorian} = require('./utils/utils');
const {getCategoryElement} = require('./utils/categories');
const {logger} = require('./utils/winstonOptions');

const app = express();
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(bodyParser.raw());
app.use(helmet());
app.use(cors());

const persianDate = require('persian-date');
persianDate.toLocale('en');

process.env.NTBA_FIX_319 = 1;

const bot = new TelegramBot(config.get('TELEGRAM_BOT_TOKEN'), {polling: true});
let scheduledTasks = [];
let autoPostTaskMap = new Map();

let telegramOption = {
    "parse_mode": "html",
    "reply_markup": {
        "one_time_keyboard": true,
        "keyboard": [
            [{text: "سوالات"}, {text: "خرید"}],
            [{text: "ارتباط با پشتیبان"}]
        ]
    }
};

let addScheduledTaskToAutoPostTaskMap = (user, scheduledTask) => {
    let oldTask = autoPostTaskMap.get(user.username);
    if (oldTask) {
        oldTask.cancel();
    }
    autoPostTaskMap.set(user.username, scheduledTask);
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
    addScheduledTaskToAutoPostTaskMap(basicInfo.user, scheduledTask);
};

let initAutoPostBasicInfo = async () => {
    try {
        let basicInfos = await AutoPostBasicInfo.loadBasicInfo();
        if (basicInfos.length != 0) {
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
        if (tasks.length != 0) {
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
        await ScheduledTask.updateScheduledTaskStatus(task._id, 'RUNNING_SCHEDULED_TASK_STATUS');
        if (task.identifiers.length != 0) {
            task.identifiers.forEach(async (identifier) => {
                await sendPost(task.user, identifier, task.silent);
                await ScheduledTask.updateScheduledTaskStatus(task._id, 'RAN_SCHEDULED_TASK_STATUS');
            })
        }
    } catch (e) {
        return Promise.reject(e);
    }
};

let executeAutoPost = async (basicInfo) => {
    try {
        if (basicInfo.active) {
            let favouritePosts = await Post.searchForAutoPost(true, basicInfo.numberOfFavouritePost);
            let normalPosts = await Post.searchForAutoPost(false, basicInfo.numberOfNormalPost);
            const posts = [...favouritePosts, ...normalPosts];
            if (posts.length != 0) {
                posts.forEach(async (post) => {
                    if (post.publishHistory.length !== 0) {
                        post.publishHistory.forEach(async (publishPostHistory) => {
                            if (publishPostHistory.active) {
                                bot.deleteMessage(post.user.channelChatIdentifier, publishPostHistory.identifier).then(async () => {
                                    await PublishPostHistory.makeDeActivePublishPostHistory(publishPostHistory._id);
                                }).catch((e) => {
                                    return Promise.reject(e);
                                });
                            }
                        })
                    }
                    await sendPost(post.user, post.identifier, basicInfo.silent);
                })
            }
        }
    } catch (e) {
        return Promise.reject(e);
    }
};

let sendPost = async (user, identifier, silent) => {
    try {
        let post = await Post.findPost(user, identifier);
        if (post.status.name !== 'DELETED_POST_STATUS') {
            await bot.sendMessage(user.channelChatIdentifier, '#EG' + post.identifier + '\n' + post.content, {
                disable_notification: silent,
                parse_mode: 'html'
            }).then(async (result) => {
                if (result.message_id) {
                    let status = getCategoryElement('SENT_POST_STATUS');
                    await Post.updatePostStatus(post._id, status);
                    await post.addPublishPostHistory(result.message_id);
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

let removePost = async (user, identifier, shouldChangePostStatus) => {
    try {
        let post = await Post.findPost(user, identifier);
        if (post.publishHistory.length !== 0) {
            post.publishHistory.forEach(async (item) => {
                let publishPostHistory = await PublishPostHistory.loadById(item);
                if (publishPostHistory.active) {
                    bot.deleteMessage(user.channelChatIdentifier, publishPostHistory.identifier).then(async () => {
                        await PublishPostHistory.makeDeActivePublishPostHistory(publishPostHistory._id);
                    });
                }
            })
        }
        if (shouldChangePostStatus) {
            let status = getCategoryElement('DELETED_POST_STATUS');
            await Post.updatePostStatus(post._id, status);
        }
        return Promise.resolve(post);
    } catch (e) {
        return Promise.reject(e);
    }
};

app.post('/api/register-user', async (req, res) => {
    try {
        const body = _.pick(req.body, ['name', 'username', 'password', 'channelChatIdentifier', 'adminChatIdentifier']);
        let user = new User(body);
        await user.save();
        handleResponse(res, true, user);
    } catch (e) {
        handleResponse(res, false, e);
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const body = _.pick(req.body, ['username', 'password']);

        let user = await User.findByCredentials(body.username, body.password);
        let token = await user.generateAuthToken();
        res.header('x-auth', token).status(200).send({success: true, data: token});
    } catch (e) {
        res.status(400).json({
            Error: `Something went wrong. ${e}`
        });
    }
});


app.post('/api/save-or-update-auto-post-scheduled-task', authenticate, async (req, res) => {
    try {
        const body = _.pick(req.body, ['interval', 'numberOfNormalPost', 'numberOfFavouritePost', 'active', 'silent']);
        const joiSchema = {
            interval: Joi.number().max(60).required(),
            numberOfNormalPost: Joi.number().required(),
            numberOfFavouritePost: Joi.number().required(),
            active: Joi.boolean().required(),
            silent: Joi.boolean().required()
        };
        let validateResult = Joi.validate(body, joiSchema);

        if (validateResult.error) {
            handleResponse(res, false, validateResult.error);
        } else {
            if (body.executeDateTime <= getCurrentDateTime()) {
                handleResponse(res, false, "INVALID EXECUTE DATE TIME");
            } else {
                let oldBasicInfo = await AutoPostBasicInfo.loadBasicInfoByUser(req.user);
                body.lastUpdateDateTime = getCurrentDateTime();
                if (oldBasicInfo) {
                    await oldBasicInfo.updateBasicInfo(body);
                    body.user = req.user;
                    scheduledAutoPostBasicInfo(body);
                } else {
                    body.creationDateTime = getCurrentDateTime();
                    body.user = req.user;
                    let basicInfo = new AutoPostBasicInfo(body);
                    await basicInfo.save();
                    scheduledAutoPostBasicInfo(basicInfo);
                }
                handleResponse(res, true, body);
            }
        }
    } catch (e) {
        handleResponse(res, false, e);
    }
});


app.post('/api/register-scheduled-task', authenticate, async (req, res) => {
    try {
        const body = _.pick(req.body, ['executeDateTime', 'identifiers', 'silent']);
        const joiSchema = {
            executeDateTime: Joi.string().min(16).max(16).required(),
            silent: Joi.boolean().required(),
            identifiers: Joi.array().required().min(1).items(Joi.number().required())
        };
        let validateResult = Joi.validate(body, joiSchema);

        if (validateResult.error) {
            handleResponse(res, false, validateResult.error);
        } else {
            if (body.executeDateTime <= getCurrentDateTime()) {
                handleResponse(res, false, "INVALID EXECUTE DATE TIME");
            } else {
                body.creationDateTime = getCurrentDateTime();
                body.lastUpdateDateTime = getCurrentDateTime();
                body.user = req.user;
                body.status = getCategoryElement('REGISTERED_SCHEDULED_TASK_STATUS');
                let task = new ScheduledTask(body);
                await task.save();
                scheduledRegisteredTask(task);
                handleResponse(res, true, body);
            }
        }
    } catch (e) {
        handleResponse(res, false, e);
    }
});


app.post('/api/search-scheduled-task', authenticate, async (req, res) => {
    try {
        const body = _.pick(req.body, ['status', 'executeDateTime', 'pagination', 'shouldReturnCount']);
        const joiSchema = {
            executeDateTime: Joi.string().optional(),
            status: Joi.object().optional().keys({
                name: Joi.string().required()
            }),
            shouldReturnCount: Joi.boolean().optional(),
            pagination: Joi.object().required().keys({
                maxResult: Joi.number().required(),
                pageNumber: Joi.number().required()
            }),
        };
        let validateResult = Joi.validate(body, joiSchema);

        if (validateResult.error) {
            handleResponse(res, false, validateResult.error);
        } else {
            let result = {};
            const searchCriteria = _.pick(body, ['identifier', 'content', 'favourite']);
            if (body.status) {
                let status = {
                    "status.name": body.status.name
                };
                Object.assign(searchCriteria, status);
            }
            if (searchCriteria.executeDateTime) {
                searchCriteria.executeDateTime = new RegExp(searchCriteria.executeDateTime, 'i');
            }

            searchCriteria.user = req.user;
            const paginationInfo = _.pick(body, ['pagination', 'shouldReturnCount']);
            if (paginationInfo.shouldReturnCount === true) {
                result.count = await ScheduledTask.searchScheduledTaskCount(searchCriteria);
                result.numberOfPages = Math.ceil(parseInt(result.count) / parseInt(paginationInfo.pagination.maxResult));
            }
            result.searchResultArray = await ScheduledTask.searchScheduledTask(searchCriteria, paginationInfo.pagination);
            result.dateTime = getCurrentDateTime();
            handleResponse(res, true, result);
        }
    } catch (e) {
        handleResponse(res, false, e);
    }
});


app.post('/api/register-post', authenticate, async (req, res) => {
    try {
        const body = _.pick(req.body, ['title', 'amount', 'content', 'attributes', 'favourite']);

        const joiSchema = {
            favourite: Joi.boolean().required(),
            title: Joi.string().optional(),
            amount: Joi.number().optional(),
            content: Joi.string().required(),
            attributes: Joi.array().max(10).items(
                Joi.object(
                    {
                        title: Joi.string().required(),
                        value: Joi.string().required()
                    }
                )
            )
        };
        let validateResult = Joi.validate(body, joiSchema);

        if (validateResult.error) {
            handleResponse(res, false, validateResult.error);
        } else {
            body.active = true;
            body.creationDateTime = getCurrentDateTime();
            body.lastUpdateDateTime = getCurrentDateTime();
            body.user = req.user;
            body.identifier = await Post.findNextIdentifier(body.user);
            body.status = getCategoryElement('REGISTERED_POST_STATUS');
            let post = new Post(body);
            await post.save();
            handleResponse(res, true, body);
        }
    } catch (e) {
        handleResponse(res, false, e);
    }
});

app.post('/api/update-post', authenticate, async (req, res) => {
    try {
        const body = _.pick(req.body, ['identifier', 'title', 'amount', 'content', 'attributes', 'favourite']);

        const joiSchema = {
            favourite: Joi.boolean().required(),
            identifier: Joi.number().required(),
            title: Joi.string().optional(),
            amount: Joi.number().optional(),
            content: Joi.string().required(),
            attributes: Joi.array().max(10).items(
                Joi.object(
                    {
                        title: Joi.string().required(),
                        value: Joi.string().required()
                    }
                )
            )
        };
        let validateResult = Joi.validate(body, joiSchema);

        if (validateResult.error) {
            handleResponse(res, false, validateResult.error);
        } else {
            let post = await Post.findPost(req.user, body.identifier);
            let oldContent = post.content;
            body.lastUpdateDateTime = getCurrentDateTime();
            await post.updatePost(body);
            if (oldContent !== body.content && post.publishHistory.length !== 0) {
                post.publishHistory.forEach(async (item) => {
                    let publishPostHistory = await PublishPostHistory.loadById(item);
                    if (publishPostHistory.active) {
                        bot.editMessageText(body.content, {
                            chat_id: req.user.channelChatIdentifier,
                            message_id: publishPostHistory.identifier,
                            disable_notification: true,
                            parse_mode: 'html'
                        }).then(async () => {
                            await PublishPostHistory.updateLastUpdateDateTime(publishPostHistory._id);
                        });
                    }
                })
            }
            handleResponse(res, true, body);
        }
    } catch (e) {
        handleResponse(res, false, e);
    }
});

app.post('/api/search-post', authenticate, async (req, res) => {
    try {
        const body = _.pick(req.body, ['identifier', 'content', 'favourite', 'status', 'pagination', 'shouldReturnCount']);
        const joiSchema = {
            identifier: Joi.number().optional(),
            content: Joi.string().optional(),
            favourite: Joi.boolean().optional(),
            shouldReturnCount: Joi.boolean().optional(),
            pagination: Joi.object().required().keys({
                maxResult: Joi.number().required(),
                pageNumber: Joi.number().required()
            }),
            status: Joi.object().optional().keys({
                name: Joi.string().required()
            })
        };
        let validateResult = Joi.validate(body, joiSchema);

        if (validateResult.error) {
            handleResponse(res, false, validateResult.error);
        } else {
            let result = {};
            const searchCriteria = _.pick(body, ['identifier', 'content', 'favourite']);
            if (body.status) {
                let status = {
                    "status.name": body.status.name
                };
                Object.assign(searchCriteria, status);
            }
            searchCriteria.user = req.user;
            const paginationInfo = _.pick(body, ['pagination', 'shouldReturnCount']);

            if (searchCriteria.content) {
                searchCriteria.content = new RegExp(searchCriteria.content, 'i');
            }
            if (paginationInfo.shouldReturnCount === true) {
                result.count = await Post.searchPostCount(searchCriteria);
                result.numberOfPages = Math.ceil(parseInt(result.count) / parseInt(paginationInfo.pagination.maxResult));
            }
            result.searchResultArray = await Post.searchPost(searchCriteria, paginationInfo.pagination);
            result.dateTime = getCurrentDateTime();
            handleResponse(res, true, result);
        }
    } catch (e) {
        handleResponse(res, false, e);
    }
});

app.post('/api/send-post', authenticate, async (req, res) => {
    const body = _.pick(req.body, ['identifier', 'silent']);
    const joiSchema = {
        identifier: Joi.number().required(),
        silent: Joi.boolean().required()
    };
    let validateResult = Joi.validate(body, joiSchema);

    if (validateResult.error) {
        handleResponse(res, false, validateResult.error);
    } else {
        try {
            await sendPost(req.user, body.identifier, body.silent);
            handleResponse(res, true, body);
        } catch (e) {
            handleResponse(res, false, e);
        }
    }
});

app.post('/api/delete-post', authenticate, async (req, res) => {
    const body = _.pick(req.body, ['identifier']);
    const joiSchema = {
        identifier: Joi.number().required()
    };
    let validateResult = Joi.validate(body, joiSchema);

    if (validateResult.error) {
        handleResponse(res, false, validateResult.error);
    } else {
        try {
            await removePost(req.user, body.identifier, true);
            handleResponse(res, true, body);
        } catch (e) {
            handleResponse(res, false, e);
        }
    }
});


app.post('/api/remove-post', authenticate, async (req, res) => {
    const body = _.pick(req.body, ['identifier']);
    const joiSchema = {
        identifier: Joi.number().required()
    };
    let validateResult = Joi.validate(body, joiSchema);

    if (validateResult.error) {
        handleResponse(res, false, validateResult.error);
    } else {
        try {
            await removePost(req.user, body.identifier, false);
            handleResponse(res, true, body);
        } catch (e) {
            handleResponse(res, false, e);
        }
    }
});


app.post('/api/delete-all-post', authenticate, async (req, res) => {
    try {
        let publishHistoryArray = await PublishPostHistory.findActivePost();
        if (publishHistoryArray.length !== 0) {
            publishHistoryArray.forEach(async (publishPostHistory) => {
                let post = publishPostHistory.post;
                let status = getCategoryElement('DELETED_POST_STATUS');
                await Post.updatePostStatus(post._id, status);
                if (publishPostHistory.active) {
                    bot.deleteMessage(req.user.channelChatIdentifier, publishPostHistory.identifier).then(async () => {
                        await PublishPostHistory.makeDeActivePublishPostHistory(publishPostHistory._id);
                    }).catch((e) => {
                        handleResponse(res, false, e);
                    });
                }
            })
        }
        handleResponse(res, true, "OPERATION HAS BEAN DONE");
    } catch (e) {
        handleResponse(res, false, e);
    }
});


app.post('/api/register-education', authenticate, async (req, res) => {
    try {
        const body = _.pick(req.body, ['question', 'answer']);

        const joiSchema = {
            question: Joi.string().required(),
            answer: Joi.string().required()
        };
        let validateResult = Joi.validate(body, joiSchema);

        if (validateResult.error) {
            handleResponse(res, false, validateResult.error);
        } else {
            body.creationDateTime = getCurrentDateTime();
            body.lastUpdateDateTime = getCurrentDateTime();
            let education = new Education(body);
            await education.save();
            handleResponse(res, true, body);
        }
    } catch (e) {
        console.log(e)
        handleResponse(res, false, e);
    }
});


app.post('/api/update-education', authenticate, async (req, res) => {
    try {
        const body = _.pick(req.body, ['question', 'answer', 'identifier']);

        const joiSchema = {
            question: Joi.string().required(),
            answer: Joi.string().required()
        };
        let validateResult = Joi.validate(body, joiSchema);

        if (validateResult.error) {
            handleResponse(res, false, validateResult.error);
        } else {
            let oldEducation = await Education.loadById(body.identifier);
            body.creationDateTime = oldEducation.creationDateTime;
            body.lastUpdateDateTime = getCurrentDateTime();
            await Education.updateEducation(body);
            handleResponse(res, true, body);
        }
    } catch (e) {
        handleResponse(res, false, e);
    }
});


bot.onText(/^\/start/, function (msg) {
    let message = `کاربر گرامی ${msg.from.username}, به ربات آنلاین اپیك گيم مرجع تخصصى و كامل انواع اکانت های ترکیبی خوش آمدید.\n`;
    bot.sendMessage(msg.chat.id, message +
        "امکانت ربات EpicGame شامل :\n" +
        "1- خرید آنلاین\n" +
        "2- مشاهده سوالات رایج به همراه پاسخ های آن ها\n" +
        "برای شروع کافیست یکی از گزینه های منو زیر را فشار دهید", telegramOption);
});

bot.onText(/سوالات/, async function onEducation(msg) {
    let educations = await Education.loadAllEducationInfo();
    let educationInfos = [];
    educations.forEach((education) => {
        educationInfos.push([{text: education.question, callback_data: education._id}])
    });
    const option = {
        reply_markup: {
            one_time_keyboard: true,
            resize_keyboard: true,
            inline_keyboard: educationInfos
        }
    };
    bot.sendMessage(msg.chat.id, "از بین سوالات زیر سوال مورد نظر خود را انتخاب کنید ؟", option);
});


bot.onText(/خرید/, async function onEducation(msg) {
    bot.sendMessage(msg.chat.id, "این بخش به زودی راه اندازی خواهد شد.", telegramOption);
});


bot.onText(/ارتباط با پشتیبان/, async function onEducation(msg) {
    bot.sendMessage(msg.chat.id, "@EGseller", telegramOption);
});


bot.on('callback_query', async function (msg) {
    try {
        console.log(msg.data);
        let education = await Education.loadById(msg.data);
        bot.sendMessage(msg.from.id, education.answer, telegramOption);
    } catch (e) {
        console.log(e);
    }
});


app.listen(config.get('PORT'), async () => {
    initAutoPostBasicInfo().then(() => {
        logger.info(`INIT AUTO POST BASIC INFO DONE`);
    }).catch((e) => {
        logger.error(`ERROR ON INIT AUTO POST BASIC INFO  : ${e}`);
    });

    initScheduledTask().then(() => {
        logger.info(`INIT SCHEDULED TASK DONE`);
    }).catch((e) => {
        logger.error(`ERROR ON INIT SCHEDULED TASK : ${e}`);
    });
    logger.info(`*** ${String(config.get('Level')).toUpperCase()} ***`);
    logger.info(`Server running on port ${config.get('PORT')}`);
});
