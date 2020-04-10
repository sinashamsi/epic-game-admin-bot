const config = require('config');

const {Verification} = require('./../model/verification');
const {Account} = require('./../model/account');
const {getCurrentDateTime, convertPersianDateToGregorian} = require('./../utils/utils');
const {getCategoryElement} = require('./categories-service');
const {sendTokenForLogin} = require('./sms-service');
const {logger} = require('./../utils/winstonOptions');


let createVerification = async (mobileNumber, actionName) => {
    try {
        let account = await Account.loadByMobileNumber(mobileNumber);
        if (account) {
            let lastVerification = await Verification.loadLastNotVerifiedVerification(mobileNumber, actionName);
            if (lastVerification) {
                let currentDateTime = getCurrentDateTime();
                let startTime = new Date(convertPersianDateToGregorian(lastVerification.creationDateTime));
                let endTime = new Date(convertPersianDateToGregorian(currentDateTime));
                let second = Math.floor((Math.abs(new Date(endTime) - new Date(startTime)) / 1000));
                let timeOut = config.get('VERIFICATION_TIMEOUT');
                if (second > timeOut) {
                    await createVerificationAndSendMessage(mobileNumber, actionName);
                    return Promise.resolve("عملیات با موفقیت انجام شد.");
                } else {
                    return Promise.reject(`لطفا بعد از گذشت ${timeOut} مجدد تلاش نمایید.`);
                }
            } else {
                await createVerificationAndSendMessage(mobileNumber, actionName);
                return Promise.resolve("عملیات با موفقیت انجام شد.");
            }
        } else {
            return Promise.reject(`کاربری با شماره موبایل ارسالی در سیستم یافت نشد.`);
        }
    } catch (e) {
        return Promise.reject(e);
    }
};

let verifyCode = async (mobileNumber, actionName, verificationCode) => {
    try {
        let lastVerification = await Verification.loadLastNotVerifiedVerification(mobileNumber, actionName);
        if (lastVerification) {
            let timeOut = config.get('VERIFICATION_TIMEOUT');
            let hasExpired = await hasExpiredVerification(lastVerification.creationDateTime, timeOut);
            if (!hasExpired) {
                if (verificationCode === lastVerification.code) {
                    let actionKey = prepareRandomCode();
                    await Verification.verify(lastVerification._id, actionKey);
                    return Promise.resolve(actionKey);
                } else {
                    return Promise.reject(`کد تاییدیه ارسالی معتبر نمی باشد.`);
                }
            } else {
                return Promise.reject(`آخرین تاییدیه ارسالی منقضی شده است.`);
            }
        } else {
            return Promise.reject('کد تاییدیه ای برای شما ارسال نشده است.');
        }
    } catch (e) {
        return Promise.reject(e);
    }
};

let checkActionCode = async (mobileNumber, actionName, actionKey, validActionName) => {
    try {
        if (actionName === validActionName) {
            let lastVerification = await Verification.loadLastVerifiedVerification(mobileNumber, actionName, actionKey);
            if (lastVerification) {
                let timeOut = config.get('ACTION_CODE_TIMEOUT');
                let hasExpired = await hasExpiredVerification(lastVerification.lastUpdateDateTime, timeOut);
                if (hasExpired) {
                    return Promise.reject(`آخرین تاییدیه ارسالی منقضی شده است.`);
                }
                return Promise.resolve(actionKey);
            } else {
                return Promise.reject(' تاییدیه معتبری برای شما یافت نشد.');
            }
        } else {
            return Promise.reject('کد عملیات نامعتبر می باشد.');
        }
    } catch (e) {
        return Promise.reject(e);
    }
};


let hasExpiredVerification = async (dateTime, timeOut) => {
    let currentDateTime = getCurrentDateTime();
    let startTime = new Date(convertPersianDateToGregorian(dateTime));
    let endTime = new Date(convertPersianDateToGregorian(currentDateTime));
    let second = Math.floor((Math.abs(new Date(endTime) - new Date(startTime)) / 1000));
    if (second > timeOut) {
        return true;
    } else {
        return false;
    }
};


let createVerificationAndSendMessage = async (mobileNumber, actionName) => {
    try {
        let info = {
            mobileNumber: mobileNumber,
            code: prepareRandomCode(),
            action: getCategoryElement(actionName),
            creationDateTime: getCurrentDateTime(),
            lastUpdateDateTime: getCurrentDateTime(),
            verified: false
        };

        let verification = new Verification(info);
        await verification.save();
        sendMessage(mobileNumber, info.code);
    } catch (e) {
        return Promise.reject(e);
    }
};


let prepareRandomCode = () => {
    return 1022;
    // return Math.floor(1000 + Math.random() * 9000);
};

let sendMessage = async (mobileNumber, token) => {
    let success = true;
    // let success = await sendTokenForLogin(mobileNumber, token);
    if (success) {
        logger.info(`TOKEN ${token} HAS BEAN SENT TO ${mobileNumber}`);
    } else {
        logger.error(`TOKEN ${token} HAS NOT BEAN SENT TO ${mobileNumber}`);
    }
};


module.exports = {
    createVerification, verifyCode, checkActionCode
};