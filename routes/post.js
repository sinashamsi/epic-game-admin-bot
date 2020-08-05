const express = require('express');
const _ = require('lodash');
const Joi = require('joi');

const {authenticate} = require('./../middleware/authenticate');

const {Post} = require('./../model/post');
const {PublishPostHistory} = require('./../model/publish-post-history');

const {removePost, sendPost, preparePostContent, prepareAndUpdatePostStatus} = require('./../service/post-service');
const {getCategoryElement, Constant} = require('./../service/categories-service');
const {loadChannel, loadChannels} = require('./../service/channel-service');
const {bot} = require('./../service/bot-service');

const {getCurrentDateTimeJson, handleResponse} = require('./../utils/utils');


const router = express.Router();


router.post('/register', authenticate, async (req, res) => {
    try {
        const body = _.pick(req.body, ['title', 'originalContent', 'amount', 'content', 'attributes', 'favourite', 'channelInfos']);

        const joiSchema = {
            favourite: Joi.boolean().required(),
            title: Joi.string().optional(),
            originalContent: Joi.string().optional(),
            amount: Joi.number().optional(),
            content: Joi.string().required(),
            attributes: Joi.array().max(10).items(
                Joi.object(
                    {
                        title: Joi.string().required(),
                        value: Joi.string().required()
                    }
                )
            ),
            channelInfos: Joi.array().min(1).items(
                Joi.object(
                    {
                        username: Joi.string().required()
                    }
                )
            )
        };
        Object.keys(body).forEach((key) => (body[key] === null || body[key] === '') && delete body[key]);
        let validateResult = Joi.validate(body, joiSchema);

        if (validateResult.error) {
            handleResponse(res, false, validateResult.error);
        } else {
            let channels = await loadChannels(req.user, body.channelInfos);
            body.creationDateTime = getCurrentDateTimeJson();
            body.lastUpdateDateTime = getCurrentDateTimeJson();
            body.user = req.user;
            body.account = req.account;
            body.identifier = await Post.findNextIdentifier(body.user);
            body.status = getCategoryElement(Constant.REGISTERED_POST_STATUS);
            body.channels = channels;
            let post = new Post(body);
            await post.save();
            handleResponse(res, true, body);
        }
    } catch (e) {
        handleResponse(res, false, e);
    }
});

router.post('/update', authenticate, async (req, res) => {
    try {
        const body = _.pick(req.body, ['identifier', 'title', 'originalContent', 'amount', 'content', 'attributes', 'favourite', 'channelInfos']);

        const joiSchema = {
            favourite: Joi.boolean().required(),
            identifier: Joi.number().required(),
            originalContent: Joi.string().optional(),
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
            ),
            channelInfos: Joi.array().items(
                Joi.object(
                    {
                        username: Joi.string().required()
                    }
                )
            )
        };
        Object.keys(body).forEach((key) => (body[key] === null || body[key] === '') && delete body[key]);
        let validateResult = Joi.validate(body, joiSchema);

        if (validateResult.error) {
            handleResponse(res, false, validateResult.error);
        } else {
            let channels = await loadChannels(req.user, body.channelInfos);
            let post = await Post.findPost(req.user, body.identifier);
            let oldContent = post.content;
            body.lastUpdateDateTime = getCurrentDateTimeJson();
            body.channels = channels;
            body.account = post.account;
            await post.updatePost(body);
            if (oldContent !== body.content && post.publishHistory.length !== 0) {
                post.publishHistory.forEach(async (item) => {
                    let publishPostHistory = await PublishPostHistory.loadById(item);
                    if (publishPostHistory.active) {
                        let postContent = preparePostContent(body);
                        bot.editMessageText(postContent, {
                            chat_id: publishPostHistory.channel.username,
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

router.post('/search', authenticate, async (req, res) => {
    try {
        const body = _.pick(req.body, ['identifier', 'content', 'favourite', 'status', 'pagination', 'shouldReturnCount', 'channelUsername']);
        const joiSchema = {
            channelUsername: Joi.string().optional(),
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
        Object.keys(body).forEach((key) => (body[key] === null || body[key] === '') && delete body[key]);
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

            if (body.channelUsername) {
                let channel = await loadChannel(req.user, body.channelUsername);
                if (channel) {
                    let channelUsername = {
                        'channels': {$in: [channel._id]}
                    };
                    Object.assign(searchCriteria, channelUsername);
                }
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
            result.dateTime = getCurrentDateTimeJson();
            handleResponse(res, true, result);
        }
    } catch (e) {
        handleResponse(res, false, e);
    }
});

router.post('/send', authenticate, async (req, res) => {
    const body = _.pick(req.body, ['identifier', 'silent', 'channelInfos']);
    const joiSchema = {
        identifier: Joi.number().required(),
        silent: Joi.boolean().required(),
        channelInfos: Joi.array().items(
            Joi.object(
                {
                    username: Joi.string().required()
                }
            )
        )
    };
    let validateResult = Joi.validate(body, joiSchema);

    if (validateResult.error) {
        handleResponse(res, false, validateResult.error);
    } else {
        try {
            body.channelInfos.forEach(async (channelInfo) => {
                try {
                    let channel = await loadChannel(req.user, channelInfo.username);
                    await removePost(req.user, body.identifier, Constant.REGISTERED_POST_STATUS, channel);
                    await sendPost(req.user, channel, body.identifier, body.silent);
                } catch (e) {
                    console.log(e)
                }
            });
            handleResponse(res, true, body);
        } catch (e) {
            handleResponse(res, false, e);
        }
    }
});

router.post('/sell', authenticate, async (req, res) => {
    try {
        const body = _.pick(req.body, ['identifier']);
        const joiSchema = {
            identifier: Joi.number().required()
        };
        let validateResult = Joi.validate(body, joiSchema);

        if (validateResult.error) {
            handleResponse(res, false, validateResult.error);
        } else {
            await removePost(req.user, body.identifier, Constant.SOLD_POST_STATUS);
            handleResponse(res, true, "POST HAS BEAN SOLD");
        }
    } catch (e) {
        handleResponse(res, false, e);
    }
});

router.post('/delete', authenticate, async (req, res) => {
    const body = _.pick(req.body, ['identifier']);
    const joiSchema = {
        identifier: Joi.number().required()
    };
    let validateResult = Joi.validate(body, joiSchema);

    if (validateResult.error) {
        handleResponse(res, false, validateResult.error);
    } else {
        try {
            await removePost(req.user, body.identifier, Constant.DELETED_POST_STATUS);
            handleResponse(res, true, body);
        } catch (e) {
            handleResponse(res, false, e);
        }
    }
});


router.post('/remove', authenticate, async (req, res) => {
    const body = _.pick(req.body, ['identifier', 'channelInfos']);
    const joiSchema = {
        identifier: Joi.number().required(),
        channelInfos: Joi.array().items(
            Joi.object(
                {
                    username: Joi.string().required()
                }
            )
        )
    };
    let validateResult = Joi.validate(body, joiSchema);

    if (validateResult.error) {
        handleResponse(res, false, validateResult.error);
    } else {
        try {
            for (const channelInfo of body.channelInfos) {
                try {
                    let channel = await loadChannel(req.user, channelInfo.username);
                    await removePost(req.user, body.identifier, Constant.REGISTERED_POST_STATUS, channel);
                } catch (e) {
                    handleResponse(res, false, e);
                }
            }
            await prepareAndUpdatePostStatus(req.user, body.identifier);
            handleResponse(res, true, body);
        } catch (e) {
            handleResponse(res, false, e);
        }
    }
});


module.exports = router;