const categories = [
    {
        name: "POST_STATUS",
        persianName: "وضعیت پست",
        elements: [
            {
                name: "REGISTERED_POST_STATUS",
                persianName: "ثبت شده"
            },
            {
                name: "SENT_POST_STATUS",
                persianName: "پست شده"
            },
            {
                name: "DELETED_POST_STATUS",
                persianName: "حذف شده"
            },
            {
                name: "SOLD_POST_STATUS",
                persianName: "فروخته شده"
            }
        ]
    },
    {
        name: "SCHEDULED_TASK_STATUS",
        persianName: "وضعیت تسک زمان بندی شده",
        elements: [
            {
                name: "REGISTERED_SCHEDULED_TASK_STATUS",
                persianName: "ثبت شده"
            },
            {
                name: "RUNNING_SCHEDULED_TASK_STATUS",
                persianName: "در حال اجرا"
            },
            {
                name: "RAN_SCHEDULED_TASK_STATUS",
                persianName: "اجرا شده"
            },
            {
                name: "CANCELED_POST_STATUS",
                persianName: "لغو شده"
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
    getCategoryElement
};