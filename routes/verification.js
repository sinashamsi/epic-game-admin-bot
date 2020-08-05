const express = require('express');
const _ = require('lodash');
const Joi = require('joi');

const {createVerification, verifyCode} = require('./../service/verification-service');

const {handleResponse} = require('./../utils/utils');


const router = express.Router();


router.post('/create', async (req, res) => {
    try {
        const body = _.pick(req.body, ['mobileNumber', 'actionName']);
        const joiSchema = {
            mobileNumber: Joi.string().max(11).min(11).required(),
            actionName: Joi.string().required()
        };
        let validateResult = Joi.validate(body, joiSchema);
        if (!validateResult.error) {
            let result = await createVerification(body.mobileNumber, body.actionName);
            handleResponse(res, true, result);
        } else {
            handleResponse(res, false, validateResult.error);
        }
    } catch (e) {
        handleResponse(res, false, e);
    }
});

router.post('/verify', async (req, res) => {
    try {
        const body = _.pick(req.body, ['mobileNumber', 'actionName', 'verificationCode']);
        const joiSchema = {
            mobileNumber: Joi.string().max(11).min(11).required(),
            actionName: Joi.string().required(),
            verificationCode: Joi.number().required()
        };
        let validateResult = Joi.validate(body, joiSchema);
        if (!validateResult.error) {
            let result = await verifyCode(body.mobileNumber, body.actionName, body.verificationCode);

            handleResponse(res, true, result);
        } else {
            handleResponse(res, false, validateResult.error);
        }
    } catch (e) {
        handleResponse(res, false, e);
    }
});

module.exports = router;