const express = require('express');
const _ = require('lodash');
const Joi = require('joi');

const {Constant} = require('./../service/categories-service');
const {sendEmail} = require('./../service/email-service');

const {authenticate} = require('./../middleware/authenticate');

const {User} = require('./../model/user');
const {Account} = require('./../model/account');

const {handleResponse} = require('./../utils/utils');

const router = express.Router();


router.post('/register', async (req, res) => {
    try {
        const body = _.pick(req.body, ['channels', 'accounts']);
        const joiSchema = {
            accounts: Joi.array().required().min(1).items(
                Joi.object(
                    {
                        name: Joi.string().required(),
                        email: Joi.string().required(),
                        password: Joi.string().required(),
                        telegramUsername: Joi.string().required(),
                        roles: Joi.array().optional(),
                    }
                )
            ) ,
            channels: Joi.array().required().min(1).items(
                Joi.object(
                    {
                        name: Joi.string().required(),
                        username: Joi.string().required()
                    }
                )
            )
        };
        Object.keys(body).forEach((key) => (body[key] === null || body[key] === Constant.EMPTY_STRING) && delete body[key]);
        let validateResult = Joi.validate(body, joiSchema);
        if (!validateResult.error) {
            let user = await User.persist(body);
            handleResponse(res, true, user);
        } else {
            handleResponse(res, false, validateResult.error);
        }
    } catch (e) {
        handleResponse(res, false, e);
    }
});

router.post('/login', async (req, res) => {
    try {
        const body = _.pick(req.body, ['email', 'password']);
        const joiSchema = {
            email: Joi.string().required(),
            password: Joi.string().required()
        };
        Object.keys(body).forEach((key) => (body[key] === null || body[key] === Constant.EMPTY_STRING) && delete body[key]);

        let validateResult = Joi.validate(body, joiSchema);

        if (!validateResult.error) {
            let account = await Account.findByCredentials(body.email, body.password);
            let token = await account.generateAuthToken();
            res.header('x-auth', token).status(200).send({success: true, data: token});
        } else {
            handleResponse(res, false, validateResult.error);
        }
    } catch (e) {
        handleResponse(res, false, e);
    }
});

router.post('/logout', authenticate, async (req, res) => {
    try {
        await req.account.removeToken(req.token);
        handleResponse(res, true, "OPERATION HAS BEAN DONE");
    } catch (e) {
        handleResponse(res, false, e);
    }
});

router.post('/reset-password', async (req, res) => {
    try {
        let newPassword = await Account.findAccountAndUpdatePassword(req.body.email);
        console.log(newPassword)
        sendEmail(req.body.email, "Reset Password", "Your new password in EpicGame is : " + newPassword);
        handleResponse(res, true, "OPERATION HAS BEAN DONE");
    } catch (e) {
        handleResponse(res, false, e);
    }
});

router.post('/account-info', authenticate, async (req, res) => {
    try {
        handleResponse(res, true, req.account);
    } catch (e) {
        handleResponse(res, false, e);
    }
});

router.post('/update-account', authenticate, async (req, res) => {
    try {
        const body = _.pick(req.body, ['name', 'email', 'password', 'oldPassword', 'telegramUsername', 'roles']);
        const joiSchema = {
            name: Joi.string().required(),
            email: Joi.string().required(),
            password: Joi.string().optional(),
            oldPassword: Joi.string().optional(),
            telegramUsername: Joi.string().required(),
            roles: Joi.array().optional()
        };
        Object.keys(body).forEach((key) => (body[key] === null || body[key] === Constant.EMPTY_STRING) && delete body[key]);
        let validateResult = Joi.validate(body, joiSchema);
        if (!validateResult.error) {
            let account = await Account.updateAccount(body, req.account);
            handleResponse(res, true, account);
        } else {
            handleResponse(res, false, validateResult.error);
        }
    } catch (e) {
        handleResponse(res, false, e);
    }
});

router.post('/save-or-update-default-post-attributes', authenticate, async (req, res) => {
    try {
        const body = _.pick(req.body, ['defaultAttributes']);
        const joiSchema = {
            defaultAttributes: Joi.array().optional().items(Joi.string().required())
        };
        let validateResult = Joi.validate(body, joiSchema);

        if (validateResult.error) {
            handleResponse(res, false, validateResult.error);
        } else {
            await req.user.updateUserDefaultAttributes(body.defaultAttributes);
            handleResponse(res, true, req.user.defaultAttributes);
        }
    } catch (e) {
        handleResponse(res, false, e);
    }
});

router.post('/fetch-user-default-post-attributes', authenticate, async (req, res) => {
    handleResponse(res, true, req.user.defaultAttributes);
});

router.post('/channel-infos', authenticate, async (req, res) => {
    try {
        handleResponse(res, true, req.user.channels);
    } catch (e) {
        handleResponse(res, false, e);
    }
});

router.post('/update-channel-infos', authenticate, async (req, res) => {
    try {
        const body = _.pick(req.body, ['channels']);
        const joiSchema = {
            channels: Joi.array().required().min(1).items(
                Joi.object(
                    {
                        name: Joi.string().required(),
                        username: Joi.string().required() ,
                        statusCode: Joi.string().required()
                    }
                )
            )
        };
        let validateResult = Joi.validate(body, joiSchema);

        if (validateResult.error) {
            handleResponse(res, false, validateResult.error);
        } else {
            await req.user.updateUserChannels(body.channels);
            handleResponse(res, true, body.channels);
        }
    } catch (e) {
        handleResponse(res, false, e);
    }
});





module.exports = router;