const nodemailer = require('nodemailer');
const {logger} = require('./../utils/winstonOptions');


let sendEmail = async (toEmail, subject, text) => {


    var smtpTransport = nodemailer.createTransport({
        host: 'mail.epicgameservices.ir',
        port: 465,
        secure: true,
        auth: {
            user: 'services@epicgameservices.ir',
            pass: 'ss09302282702'
        }
    });
    var mailOptions = {
        to: toEmail,
        from: 'services@epicgameservices.ir',
        subject: subject,
        text: text
    };
    smtpTransport.sendMail(mailOptions, function(err, sent){
        console.log(err)
        if(err){
            console.log(err)
        } else {
            console.log('message sent')
        }
    });


    // let transporter = nodemailer.createTransport({
    //     host: 'mail.epicgameservices.ir',
    //     secure: true,
    //     port: 465,
    //     auth: {
    //         user: 'services@epicgameservices.ir',
    //         pass: 'ss09302282702'
    //     }
    // });
    //
    // console.log("hi")
    // transporter.sendMail({
    //     from: 'services@epicgameservices.ir',
    //     to: toEmail,
    //     subject: subject,
    //     text: text
    // }).catch(e =>{
    //     console.log(e)
    //     logger.error(`ERROR ON SEND EMAIL : ${e}`);
    // }).then(result =>{
    //     console.log(result)
    // });
};

module.exports = {
    sendEmail
};