const config = require('config');
const express = require('express');
const helmet = require('helmet');
const bodyParser = require('body-parser');
const cors = require('cors');
const fileupload = require("express-fileupload");
const persianDate = require('persian-date');

const {logger} = require('./utils/winstonOptions');
const {initAutoPostBasicInfo, initScheduledTask, scheduleOldPostFinder, scheduleNotSoldForLongTimePostFinder} = require('./service/scheduler-service');
const {initBot} = require('./service/bot-service');

const accountRouter = require('./routes/account');
const educationRouter = require('./routes/education');
const postRouter = require('./routes/post');
const schedulerRouter = require('./routes/scheduler');
const userRouter = require('./routes/user');
const verificationRouter = require('./routes/verification');

const app = express();
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(bodyParser.raw());
app.use(helmet());
app.use(cors());
app.use(fileupload());

app.use('/api/account', accountRouter);
app.use('/api/education', educationRouter);
app.use('/api/post', postRouter);
app.use('/api/scheduler', schedulerRouter);
app.use('/api/user', userRouter);
app.use('/api/verification', verificationRouter);

persianDate.toLocale('en');

process.env.NTBA_FIX_319 = 1;

app.listen(config.get('PORT'), async () => {

    initBot();
    scheduleOldPostFinder();
    scheduleNotSoldForLongTimePostFinder();
    initAutoPostBasicInfo();
    initScheduledTask();

    logger.info(`*** ${String(config.get('Level')).toUpperCase()} ***`);
    logger.info(`Server running on port ${config.get('PORT')}`);
});
