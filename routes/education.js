const express = require('express');
const _ = require('lodash');
const Joi = require('joi');

const {authenticate} = require('./../middleware/authenticate');

const {Education} = require('./../model/education');

const {handleResponse, getCurrentDateTimeJson} = require('./../utils/utils');


const router = express.Router();

router.post('/register', authenticate, async (req, res) => {
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
            body.creationDateTime = getCurrentDateTimeJson();
            body.lastUpdateDateTime = getCurrentDateTimeJson();
            let education = new Education(body);
            await education.save();
            handleResponse(res, true, body);
        }
    } catch (e) {
        handleResponse(res, false, e);
    }
});


router.post('/update', authenticate, async (req, res) => {
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
            body.lastUpdateDateTime = getCurrentDateTimeJson();
            await Education.updateEducation(body);
            handleResponse(res, true, body);
        }
    } catch (e) {
        handleResponse(res, false, e);
    }
});


module.exports = router;