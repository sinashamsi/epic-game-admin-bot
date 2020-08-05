const _ = require('lodash');
const persianDate = require('persian-date');
persianDate.toLocale('en');

String.prototype.replaceAll = function (search, replace) {
    if (replace === undefined) {
        return this.toString();
    }

    return this.replace(new RegExp('[' + search + ']', 'g'), replace);
};


let handleResponse = (res, success, data) => {
    let response = {success, data};
    res.status(success ? 200 : 400).send(response);
};

let getCurrentDateTime = () => {
    const dateTime = new persianDate().format('YYYY/MM/DD-HH:mm:ss');
    return dateTime;
};

let getCurrentDateTimeJson = () => {
    let dataTime = new persianDate().format('YYYY/MM/DD-HH:mm:ss');
    return {
        persianDateTime : dataTime ,
        englishDateTime : convertPersianDateToGregorian(dataTime)
    };
};


let getNthHourAfter = (dateTime, count) => {
    let dateTimeSplited = dateTime.split("-");
    let dateSplited = dateTimeSplited[0].split("/");
    let timeSplited = dateTimeSplited[1].split(":");
    const parts = [...dateSplited, ...timeSplited];
    let result = parts.map(function (item) {
        return parseInt(item, 10);
    });
    return new persianDate(result).add('hours', count).format('YYYY/MM/DD-HH:mm:ss');
};


let removeFromModel = (model, keys) => {
    let modelObject = model.toObject();
    let result = {};
    Object.keys(modelObject).forEach((key) => {
        let found = false;
        keys.forEach((badKey) => {
            if (badKey === key) {
                found = true;
            }
        });
        if (!found) {
            result[key] = modelObject[key];
        }
    });
    return result;



};


let JalaliDate = {
    g_days_in_month: [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31],
    j_days_in_month: [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29]
};

convertPersianDateToGregorian = function(dataTime) {
    let splitedDataTime = _.split(dataTime, '-');
    let timePart = "";
    if (splitedDataTime.length > 1) {
        timePart = "-" + splitedDataTime[1];
    }

    let dateArray = _.split(splitedDataTime[0], '/');
    j_y = parseInt(dateArray[0]);
    j_m = parseInt(dateArray[1]);
    j_d = parseInt(dateArray[2]);
    var jy = j_y - 979;
    var jm = j_m - 1;
    var jd = j_d - 1;

    var j_day_no = 365 * jy + parseInt(jy / 33) * 8 + parseInt((jy % 33 + 3) / 4);
    for (var i = 0; i < jm; ++i) j_day_no += JalaliDate.j_days_in_month[i];

    j_day_no += jd;

    var g_day_no = j_day_no + 79;

    var gy = 1600 + 400 * parseInt(g_day_no / 146097); /* 146097 = 365*400 + 400/4 - 400/100 + 400/400 */
    g_day_no = g_day_no % 146097;

    var leap = true;
    if (g_day_no >= 36525) /* 36525 = 365*100 + 100/4 */
    {
        g_day_no--;
        gy += 100 * parseInt(g_day_no / 36524); /* 36524 = 365*100 + 100/4 - 100/100 */
        g_day_no = g_day_no % 36524;

        if (g_day_no >= 365) g_day_no++;
        else leap = false;
    }

    gy += 4 * parseInt(g_day_no / 1461); /* 1461 = 365*4 + 4/4 */
    g_day_no %= 1461;

    if (g_day_no >= 366) {
        leap = false;

        g_day_no--;
        gy += parseInt(g_day_no / 365);
        g_day_no = g_day_no % 365;
    }

    for (var i = 0; g_day_no >= JalaliDate.g_days_in_month[i] + (i == 1 && leap); i++)
        g_day_no -= JalaliDate.g_days_in_month[i] + (i == 1 && leap);
    var gm = i + 1;
    var gd = g_day_no + 1;

    gm = gm < 10 ? "0" + gm : gm;
    gd = gd < 10 ? "0" + gd : gd;

    return gy + '/' + gm + '/' + gd + timePart;
};

module.exports = {
    handleResponse,
    getCurrentDateTime,
    removeFromModel,
    convertPersianDateToGregorian,
    getCurrentDateTimeJson,
    getNthHourAfter
};