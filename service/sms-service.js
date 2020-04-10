const config = require('config');
const axios = require('axios');
const {Constant} = require('./categories-service');


let fetchToken = async () => {
    const data = {
        UserApiKey: config.get(Constant.SMS_USER_API_KEY),
        SecretKey: config.get(Constant.SMS_SECRET_KEY)
    };
    let tokenKey = null;
    return await axios({
        method: 'POST',
        url: `http://RestfulSms.com/api/Token`,
        headers: {
            'Content-Type': 'application/json'
        },
        data: data
    }).then(response => {
        if (response.status === 201) {
            tokenKey = response.data.TokenKey;
        }
        return tokenKey;
    }).catch((error) => {
        throw error
    });
};


let sendTokenForLogin = async (mobileNumber, verificationCode) => {
    let token = await fetchToken();
    let data = {
        ParameterArray: [
            {Parameter: "VerificationCode", ParameterValue: verificationCode}
        ],
        "Mobile": mobileNumber,
        "TemplateId": config.get(Constant.SMS_TEMPLATE_ID_FOR_LOGIN)
    };
    return await axios({
        method: 'POST',
        url: `http://RestfulSms.com/api/UltraFastSend`,
        headers: {
            'Content-Type': 'application/json',
            'x-sms-ir-secure-token': token
        },
        data: data
    }).then(response => {
        if (response.status === 201 && response.data.IsSuccessful) {
            return true;
        } else {
            return false;
        }
    }).catch((error) => {
        throw error
    });
};

module.exports = {
    fetchToken, sendTokenForLogin
};