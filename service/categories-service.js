let Constant = Object.freeze({
    REGISTERED_POST_STATUS: 'REGISTERED_POST_STATUS',
    SENT_POST_STATUS: 'SENT_POST_STATUS',
    DELETED_POST_STATUS: 'DELETED_POST_STATUS',
    SOLD_POST_STATUS: 'SOLD_POST_STATUS',
    REGISTERED_SCHEDULED_TASK_STATUS: 'REGISTERED_SCHEDULED_TASK_STATUS',
    RUNNING_SCHEDULED_TASK_STATUS: 'RUNNING_SCHEDULED_TASK_STATUS',
    RAN_SCHEDULED_TASK_STATUS: 'RAN_SCHEDULED_TASK_STATUS',
    CANCELED_POST_STATUS: 'CANCELED_POST_STATUS',
    LOGIN_VERIFICATION_ACTION_TYPE: 'LOGIN_VERIFICATION_ACTION_TYPE',
    SMS_USER_API_KEY: 'SMS_USER_API_KEY',
    SMS_SECRET_KEY: 'SMS_SECRET_KEY',
    SMS_TEMPLATE_ID_FOR_LOGIN: 'SMS_TEMPLATE_ID_FOR_LOGIN',

    ADMIN_ROLE: 'ADMIN_ROLE',
    USER_ROLE: 'USER_ROLE'




});

const categories = [
    {
        name: "POST_STATUS",
        persianName: "وضعیت پست",
        elements: [
            {
                name: Constant.REGISTERED_POST_STATUS,
                persianName: "ثبت شده"
            },
            {
                name: Constant.SENT_POST_STATUS,
                persianName: "پست شده"
            },
            {
                name: Constant.DELETED_POST_STATUS,
                persianName: "حذف شده"
            },
            {
                name: Constant.SOLD_POST_STATUS,
                persianName: "فروخته شده"
            }
        ]
    },
    {
        name: "SCHEDULED_TASK_STATUS",
        persianName: "وضعیت تسک زمان بندی شده",
        elements: [
            {
                name: Constant.REGISTERED_SCHEDULED_TASK_STATUS,
                persianName: "ثبت شده"
            },
            {
                name: Constant.RUNNING_SCHEDULED_TASK_STATUS,
                persianName: "در حال اجرا"
            },
            {
                name: Constant.RAN_SCHEDULED_TASK_STATUS,
                persianName: "اجرا شده"
            },
            {
                name: Constant.CANCELED_POST_STATUS,
                persianName: "لغو شده"
            }
        ]
    },
    {
        name: "VERIFICATION_ACTION_TYPE",
        persianName: "نوع عملیات تأیید",
        elements: [
            {
                name: Constant.LOGIN_VERIFICATION_ACTION_TYPE,
                persianName: "عملیات تأیید جهت ورود"
            }
        ]
    }
];


let getCategoryElement = (name) => {
    let result = null;
    categories.forEach((category) => {
        category.elements.forEach((element) => {
            if (element.name === name) {
                result = element;
            }
        })
    });
    return result;
};


module.exports = {
    getCategoryElement, Constant
};