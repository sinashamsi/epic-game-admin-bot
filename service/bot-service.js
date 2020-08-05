const config = require('config');
const TelegramBot = require('node-telegram-bot-api');
const bot = new TelegramBot(config.get('TELEGRAM_BOT_TOKEN'), {polling: true});

let telegramOption = {
    "parse_mode": "html",
    "reply_markup": {
        "one_time_keyboard": true,
        "keyboard": [
            [{text: "سوالات"}, {text: "خرید"}],
            [{text: "ارتباط با پشتیبان"}]
        ]
    }
};


let initBot = () => {
    bot.onText(/^\/start/, function (msg) {
        let message = `کاربر گرامی ${msg.from.username}, به ربات آنلاین اپیك گيم مرجع تخصصى و كامل انواع اکانت های ترکیبی خوش آمدید.\n`;
        bot.sendMessage(msg.chat.id, message +
            "امکانت ربات EpicGame شامل :\n" +
            "1- خرید آنلاین\n" +
            "2- مشاهده سوالات رایج به همراه پاسخ های آن ها\n" +
            "برای شروع کافیست یکی از گزینه های منو زیر را فشار دهید", telegramOption);
    });

    bot.onText(/سوالات/, async function onEducation(msg) {
        let educations = await Education.loadAllEducationInfo();
        let educationInfos = [];
        educations.forEach((education) => {
            educationInfos.push([{text: education.question, callback_data: education._id}])
        });
        const option = {
            reply_markup: {
                one_time_keyboard: true,
                resize_keyboard: true,
                inline_keyboard: educationInfos
            }
        };
        bot.sendMessage(msg.chat.id, "از بین سوالات زیر سوال مورد نظر خود را انتخاب کنید ؟", option);
    });


    bot.onText(/خرید/, async function onEducation(msg) {
        bot.sendMessage(msg.chat.id, "این بخش به زودی راه اندازی خواهد شد.", telegramOption);
    });


    bot.onText(/ارتباط با پشتیبان/, async function onEducation(msg) {
        bot.sendMessage(msg.chat.id, "@EGseller", telegramOption);
    });


    bot.on('callback_query', async function (msg) {
        try {
            let education = await Education.loadById(msg.data);
            bot.sendMessage(msg.from.id, education.answer, telegramOption);
        } catch (e) {
            console.log(e);
        }
    });
};


module.exports = {
    bot, initBot
};