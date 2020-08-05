const express = require('express');
const router = express.Router();
const _ = require('lodash');
const Joi = require('joi');

const {authenticate} = require('./../middleware/authenticate');

const {AutoPostBasicInfo} = require('./../model/auto-post-basic-info');
const {ScheduledTask} = require('./../model/scheduled-task');

const {handleResponse, getCurrentDateTime, getCurrentDateTimeJson} = require('./../utils/utils');
const {scheduledAutoPostBasicInfo, scheduledRegisteredTask} = require('./../service/scheduler-service');
const {getCategoryElement, Constant} = require('./../service/categories-service');
const {loadChannel} = require('./../service/channel-service');


router.post('/save-or-update-auto-posting', authenticate, async (req, res) => {
    try {
        const body = _.pick(req.body, ['interval', 'numberOfNormalPost', 'numberOfFavouritePost', 'active', 'silent', 'channelUsername']);
        const joiSchema = {
            interval: Joi.number().max(60).required(),
            numberOfNormalPost: Joi.number().required(),
            numberOfFavouritePost: Joi.number().required(),
            active: Joi.boolean().required(),
            silent: Joi.boolean().required(),
            channelUsername: Joi.string().required()
        };

        let validateResult = Joi.validate(body, joiSchema);

        if (validateResult.error) {
            handleResponse(res, false, validateResult.error);
        } else {
            let channel = await loadChannel(req.user, body.channelUsername);
            let oldBasicInfo = await AutoPostBasicInfo.loadBasicInfoByChannel(channel._id);
            body.lastUpdateDateTime = getCurrentDateTimeJson();
            if (oldBasicInfo) {
                body.user = req.user;
                body.channel = channel;
                await oldBasicInfo.updateBasicInfo(body);
                scheduledAutoPostBasicInfo(body);
            } else {
                body.creationDateTime = getCurrentDateTimeJson();
                body.user = req.user;
                body.channel = channel;
                let basicInfo = new AutoPostBasicInfo(body);
                await basicInfo.save();
                scheduledAutoPostBasicInfo(basicInfo);
            }
            handleResponse(res, true, body);
        }
    } catch (e) {
        console.log(e)
        handleResponse(res, false, e);
    }
});


router.post('/fetch-auto-post-scheduled-task', authenticate, async (req, res) => {
    try {
        let basicInfos = await AutoPostBasicInfo.loadBasicInfoByUser(req.user);
        handleResponse(res, true, basicInfos);
    } catch (e) {
        handleResponse(res, false, e);
    }
});


router.post('/register-scheduled-task', authenticate, async (req, res) => {
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
                body.status = getCategoryElement(Constant.REGISTERED_SCHEDULED_TASK_STATUS);
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

router.post('/search-scheduled-task', authenticate, async (req, res) => {
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


module.exports = router;