const constants = require('./constants');
const mongo = require('mongodb');
const https = require('https');
const moment = require('moment');

module.exports = {
    deleteMessages: function (item) {
        return new Promise(function (resolve, reject) {
            if (item.telegramIdentifiers !== undefined && item.telegramIdentifiers.length > 0) {
                item.telegramIdentifiers.forEach(function (identifier) {
                    const data = JSON.stringify({
                        'chat_id': constants.TELEGRAM_CHAT_IDENTIFIER,
                        'message_id': identifier
                    });

                    const options = {
                        hostname: 'api.telegram.org',
                        port: 443,
                        path: '/bot' + constants.TELEGRAM_BOT_TOKEN + '/deleteMessage',
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json; charset: UTF-8'
                        }
                    };

                    const req = https.request(options, (res) => {
                        res.on("data", data => {
                        });
                    });

                    req.on('error', (error) => {
                        reject(error);
                    });
                    req.write(data);
                    req.end();
                });

                mongo.connect(constants.DATABASE_ADDRESS, (error, db) => {
                    if (error) {
                        reject(error);
                    }
                    let query = {_id: item._id};
                    item.telegramIdentifiers = [];
                    db.collection("accounts").updateOne(query, item, (err, collection) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(item);
                        }
                    });
                });
            } else {
                resolve(item);
            }
        });

    },
    sendMessage: function (item, silent) {
        return new Promise(function (resolve, reject) {
            if (item !== undefined && item !== null) {
                const data = JSON.stringify({
                    'chat_id': constants.TELEGRAM_CHAT_IDENTIFIER,
                    'text': '#EG' + item.identifier + '\n' + item.content + '\n' + '👨‍💻@EGseller' ,
                    'silent' : silent ,
                    'parse_mode': 'html'
                });

                const options = {
                    hostname: 'api.telegram.org',
                    port: 443,
                    path: '/bot' + constants.TELEGRAM_BOT_TOKEN + '/sendMessage',
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json; charset: UTF-8'
                    }
                };

                const req = https.request(options, (res) => {
                    let body = "";
                    res.on("data", data => {
                        body += data;
                    });
                    res.on("end", () => {
                        body = JSON.parse(body);
                        mongo.connect(constants.DATABASE_ADDRESS, (error, db) => {
                            if (error) {
                                reject(error);
                            }
                            let query = {_id: item._id};
                            item.telegramIdentifiers.push(body.result.message_id);
                            item.lastPublishDataTime = moment().format('YYYY/MM/DD-hh:mm:ss');
                            db.collection("accounts").updateOne(query, item, (err, collection) => {
                                if (err) {
                                    reject(err);
                                }
                            });
                        });
                        resolve(body);
                    });
                });

                req.on('error', (error) => {
                    reject(error);
                });

                req.write(data);
                req.end();
            }
        });
    }
};

