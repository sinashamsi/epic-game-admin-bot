const telegramService = require('./telegramService');
// const TelegramBot = require('node-telegram-bot-api');
const mongo = require('mongodb');
const express = require('express');
const bodyParser = require('body-parser');
const cron = require('node-cron');
const constants = require('./constants');
// const bot = new TelegramBot(constants.TELEGRAM_BOT_TOKEN, {polling: true});
const cors = require('cors');


const fs = require('fs');
const util = require('util');
const log_file = fs.createWriteStream('./debug.log', {flags: 'w'});
const log_stdout = process.stdout;

console.log = function (d) { //
    log_file.write(util.format(d) + '\n');
    log_stdout.write(util.format(d) + '\n');
};


let task = cron.schedule("*/30 * * * *", () => {
    mongo.connect(constants.DATABASE_ADDRESS, function (error, db) {
        if (!error) {
            let query = {task: 'auto-posting-accounts'};
            db.collection("tasks").find(query).toArray((err, collection) => {
                if (err) throw err;
                if (collection.length === 1 && collection[0].active) {
                    let hour = new Date().getHours();
                    let silent = !(hour > 9 && hour < 22);
                    mongo.connect(constants.DATABASE_ADDRESS, function (error, db) {
                        if (!error) {
                            db.collection("accounts").find({active: true}).sort({
                                lastPublishDataTime: 1,
                                identifier: 1
                            }).limit(7).toArray((err, collection) => {
                                if (err) {
                                    throw err;
                                } else {
                                    collection.forEach(function (item) {
                                        console.log(item.telegramIdentifiers);
                                        if (item.telegramIdentifiers !== null && item.telegramIdentifiers !== undefined && item.telegramIdentifiers.length !== 0) {
                                            let deletePromise = telegramService.deleteMessages(item);
                                            deletePromise.then(function (result) {
                                                telegramService.sendMessage(item, silent);
                                            }, function (err) {
                                                console.log(err);
                                            })
                                        } else {
                                            telegramService.sendMessage(item, silent);
                                        }
                                    });
                                }
                            });
                        }
                    });
                }
                db.close();
            });

        }
    });
});

task.start();

const app = express();
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(bodyParser.raw());
app.use(cors());

app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    const auth = {login: 'sina', password: 'shamsi'};
    const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
    const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':');
    if (login && password && login === auth.login && password === auth.password) {
        return next();
    }
    res.set('WWW-Authenticate', 'Basic realm="401"');
    res.status(401).send('Authentication required.')
});

app.post('/delete-account', function (req, res) {
    mongo.connect(constants.DATABASE_ADDRESS, function (error, db) {
        if (error) {
            res.status(401).send({"success": false, "message": "خطایی رخ داده است.", "result": error});
        }
        db.collection("accounts").deleteMany(req.body, (er, collection) => {
            if (er) {
                res.status(401).send({
                    "success": false,
                    "message": er
                });
            } else {
                res.send({
                    "success": true,
                    "message": "عملیات با موفقیت انجام شد."
                });
            }
            db.close();
        });
    });
});


app.post('/add-account', function (req, res) {
    mongo.connect(constants.DATABASE_ADDRESS, function (error, db) {
        let query = {username: req.body.username, password: req.body.password, active: true};
        db.collection("accounts").find(query).toArray((err, collection) => {
            if (error) {
                res.status(401).send({"success": false, "message": error});
            } else {
                if (collection.length !== 0) {
                    res.status(401).send({"success": false, "message": "این اکانت قبلا ثبت شده است."});
                } else {
                    let identifier = 100;
                    mongo.connect(constants.DATABASE_ADDRESS, function (error, db) {
                        if (error) {
                            res.status(401).send({"success": false, "message": error});
                        } else {
                            db.collection("accounts").find({}).sort({identifier: -1}).limit(1).toArray((err, collection) => {
                                if (err) {
                                    res.status(401).send({"success": false, "message": err});
                                } else {
                                    console.log(collection);
                                    if (collection.length === 1) {
                                        identifier = collection[0].identifier + 1;
                                    }
                                    req.body.identifier = identifier;
                                    req.body.active = true;
                                    req.body.telegramIdentifiers = [];
                                    req.body.lastPublishDataTime = null;

                                    mongo.connect(constants.DATABASE_ADDRESS, function (error, db) {
                                        if (error) {
                                            res.status(401).send({"success": false, "message": error});
                                        } else {
                                            db.collection("accounts").insertOne(req.body, (er, collection) => {
                                                if (er) {
                                                    res.status(401).send({
                                                        "success": false,
                                                        "message": er
                                                    });
                                                } else {
                                                    res.send({
                                                        "success": true,
                                                        "message": "عملیات با موفقیت انجام شد."
                                                    });
                                                }
                                            });
                                        }
                                    });
                                }
                            });
                        }
                    });
                }
            }
        });
        db.close();
    });
});


app.post('/deActive-account', function (req, res) {
    let hasError = false;
    mongo.connect(constants.DATABASE_ADDRESS, function (error, db) {
        if (error) {
            res.status(401).send({"success": false, "message": error});
        } else {
            db.collection("accounts").find(req.body).toArray((err, collection) => {
                if (err) {
                    res.status(401).send({"success": false, "message": "خطایی رخ داده است."});
                } else {
                    collection.forEach(function (item) {
                        let deletePromise = telegramService.deleteMessages(item);
                        deletePromise.then(function (result) {
                            mongo.connect(constants.DATABASE_ADDRESS, (error, db) => {
                                if (error) {
                                    res.status(401).send({"success": false, "message": error});
                                } else {
                                    let query = {identifier: item.identifier};
                                    item.active = false;
                                    db.collection("accounts").updateOne(query, item, (err, collection) => {
                                        if (err) {
                                            res.status(401).send({"success": false, "message": err});
                                            hasError = true;
                                            return;
                                        }
                                    });
                                }
                            });
                        }, function (err) {
                            res.status(401).send({"success": false, "message": "خطایی رخ داده است.", error: err});
                            hasError = true;
                            return;
                        });

                    });
                    if (!hasError) {
                        res.send({"success": true, "message": "عملیات با موفقیت انجام شد."});
                    }
                }
                db.close();
            });
        }
    });
});


app.post('/fetch-accounts', function (req, res) {
    mongo.connect(constants.DATABASE_ADDRESS, function (error, db) {
        if (error) {
            res.status(401).send({"success": false, "message": error});
        }

        let query = {};
        if (req.body !== null && req.body !== undefined) {
            if (req.body.identifier !== null && req.body.identifier !== undefined && req.body.identifier !== '') {
                query.identifier = req.body.identifier;
            }
            if (req.body.content !== null && req.body.content !== undefined && req.body.content !== '') {
                query.content = new RegExp(req.body.content, 'i');
            }

            if (req.body.active !== null && req.body.active !== undefined && req.body.active !== '') {
                query.active = (req.body.active === "true");
            }
        }


        db.collection("accounts").find(query).toArray((err, collection) => {
            if (err) throw err;
            db.close();
            res.send({"success": true, data: collection, "message": "عملیات با موفقیت انجام شد."});
        });
    });
});

app.post('/post-accounts', function (req, res) {
    mongo.connect(constants.DATABASE_ADDRESS, function (error, db) {
        if (error) {
            res.status(401).send({"success": false, "message": "خطایی رخ داده است."});
        }
        db.collection("accounts").find({active: true}).toArray((err, collection) => {
            if (err) throw err;
            collection.forEach(function (item) {
                let sendPromise = telegramService.sendMessage(item, false);
                sendPromise.then(function (result) {
                }, function (err) {
                    res.status(401).send({"success": false, "message": "خطایی رخ داده است."});
                });
            });
            db.close();
            res.send({"success": true, "message": "عملیات با موفقیت انجام شد."});
        });
    });
});

app.post('/post-account', function (req, res) {
    mongo.connect(constants.DATABASE_ADDRESS, function (error, db) {
        if (error) {
            res.status(401).send({"success": false, "message": "خطایی رخ داده است."});
        }
        db.collection("accounts").find(req.body).toArray((err, collection) => {
            if (err) throw err;
            collection.forEach(function (item) {
                let sendPromise = telegramService.sendMessage(item, false);
                sendPromise.then(function (result) {
                    res.send({
                        "success": true,
                        "message": "عملیات با موفقیت انجام شد.",
                        "result": result,
                        "item": item
                    });
                }, function (err) {
                    res.status(401).send({"success": false, "message": "خطایی رخ داده است."});
                });
            });
            db.close();
        });
    });
});

app.post('/remove-accounts', function (req, res) {
    mongo.connect(constants.DATABASE_ADDRESS, function (error, db) {
        if (error) {
            res.status(401).send({"success": false, "message": "خطایی رخ داده است."});
        }
        db.collection("accounts").find({active: true}).toArray((err, collection) => {
            if (err) throw err;
            collection.forEach(function (item) {
                let deletePromise = telegramService.deleteMessages(item);
                deletePromise.then(function (result) {
                }, function (err) {
                    res.status(401).send({"success": false, "message": "خطایی رخ داده است."});
                });
            });
            db.close();
            res.send({"success": true, "message": "عملیات با موفقیت انجام شد."});
        });
    });
});

app.post('/remove-account', function (req, res) {
    mongo.connect(constants.DATABASE_ADDRESS, function (error, db) {
        if (error) {
            res.status(401).send({"success": false, "message": "خطایی رخ داده است."});
        }
        db.collection("accounts").find(req.body).toArray((err, collection) => {
            if (err) throw err;
            collection.forEach(function (item) {
                let deletePromise = telegramService.deleteMessages(item);
                deletePromise.then(function (result) {
                }, function (err) {
                    res.status(401).send({"success": false, "message": "خطایی رخ داده است."});
                });
            });
            db.close();
            res.send({"success": true, "message": "عملیات با موفقیت انجام شد."});
        });
    });
});

app.post('/update-account', function (req, res) {
    mongo.connect(constants.DATABASE_ADDRESS, function (error, db) {
        if (error) {
            res.status(401).send({"success": false, "message": "خطایی رخ داده است."});
        }
        let query = {identifier: req.body.identifier};
        db.collection("accounts").find(query).toArray((err, collection) => {
            if (err) throw err;
            collection.forEach(function (item) {
                mongo.connect(constants.DATABASE_ADDRESS, (error, db) => {
                    if (error) {
                        res.status(401).send({"success": false, "message": error});
                    } else {
                        item.username = req.body.username;
                        item.password = req.body.password;
                        item.content = req.body.content;
                        db.collection("accounts").updateOne(query, item, (err, collection) => {
                            if (err) {
                                res.status(401).send({"success": false, "message": error});
                            }
                        });
                    }
                });
            });
            db.close();
            res.send({"success": true, "message": "عملیات با موفقیت انجام شد."});
        });
    });
});


app.post('/update-schedule-task', function (req, res) {
    mongo.connect(constants.DATABASE_ADDRESS, function (error, db) {
        if (error) {
            res.status(401).send({"success": false, "message": "خطایی رخ داده است."});
        }
        // 'auto-posting-accounts'
        let query = {task: req.body.task};
        db.collection("tasks").find(query).toArray((err, collection) => {
            if (err) throw err;
            collection.forEach(function (item) {
                mongo.connect(constants.DATABASE_ADDRESS, (error, db) => {
                    if (error) {
                        res.status(401).send({"success": false, "message": error});
                    } else {
                        item.active = req.body.active;
                        db.collection("tasks").updateOne(query, item, (err, collection) => {
                            if (err) {
                                res.status(401).send({"success": false, "message": error});
                            }
                        });
                    }
                });
            });
            db.close();
            res.send({"success": true, "message": "عملیات با موفقیت انجام شد."});
        });
    });
});


app.post('/add-schedule-task', function (req, res) {
    mongo.connect(constants.DATABASE_ADDRESS, function (error, db) {
        if (error) {
            res.status(401).send({"success": false, "message": "خطایی رخ داده است."});
        }
        db.collection("tasks").insertOne(req.body, (er, collection) => {
            if (er) {
                res.status(401).send({
                    "success": false,
                    "message": er
                });
            } else {
                res.send({
                    "success": true,
                    "message": "عملیات با موفقیت انجام شد."
                });
            }
        });
        db.close();
        res.send({"success": true, "message": "عملیات با موفقیت انجام شد."});
    });
});


app.post('/fetch-schedule-task', function (req, res) {
    mongo.connect(constants.DATABASE_ADDRESS, function (error, db) {
        if (error) {
            res.status(401).send({"success": false, "message": "خطایی رخ داده است.", "result": error});
        }
        let query = {task: req.body.task};
        db.collection("tasks").find(query).toArray((err, collection) => {
            if (err) throw err;
            if (collection.length === 1) {
                res.send({"success": true, "message": "عملیات با موفقیت انجام شد.", "data": collection[0]});
            } else if (collection.length === 0) {
                res.send({"success": true, "message": "عملیات با موفقیت انجام شد.", "data": null});
            } else {
                res.status(401).send({"success": false, "message": "خطایی رخ داده است.", "result": collection});
            }
            db.close();
        });
    });
});


app.post('/login', function (req, res) {
    res.send({"success": true, "message": "کاربر معتبر می باشد"});
});

// bot.on('message', (message) => {
//     bot.sendMessage(message.chat.id, "HI");
// });


app.listen(8081, function () {
    console.log("SERVER IS UP")
});