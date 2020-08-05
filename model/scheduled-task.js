const {mongoose} = require('./../db/mongoose');
const {getCurrentDateTimeJson} = require('./../utils/utils');
const {getCategoryElement, Constant} = require('./../service/categories-service');

let scheduledTaskSchema = new mongoose.Schema({
    creationDateTime: {
        englishDateTime: {
            type: String,
            required: true,
            trim: true
        },
        persianDateTime: {
            type: String,
            required: true,
            trim: true
        }
    },
    lastUpdateDateTime: {
        englishDateTime: {
            type: String,
            required: true,
            trim: true
        },
        persianDateTime: {
            type: String,
            required: true,
            trim: true
        }
    },
    executeDateTime: {
        type: String,
        required: true,
        trim: true
    },
    identifiers: [{
        type: Number,
        required: true
    }] ,
    silent : {
        type: Boolean,
        required: true
    },
    user: {type: mongoose.Schema.ObjectId, ref: 'User'},
    status: {
        name: {
            type: String,
            required: true,
            trim: true
        },
        persianName: {
            type: String,
            required: true,
            trim: true
        }
    }
});


scheduledTaskSchema.statics.updateScheduledTaskStatus = function (id, statusCode) {
    let scheduledTask = this;
    let status = getCategoryElement(statusCode);
    return scheduledTask.updateOne({_id: id}, {lastUpdateDateTime: getCurrentDateTimeJson(), status: status});
};


scheduledTaskSchema.statics.loadById = function (id) {
    let scheduledTask = this;
    return scheduledTask.findOne({
        _id: id,
    });
};

scheduledTaskSchema.statics.loadAllRegisteredScheduledTask = function () {
    let scheduledTask = this;
    return scheduledTask.find({
        status: getCategoryElement(Constant.REGISTERED_SCHEDULED_TASK_STATUS),
    }).populate('user');
};

scheduledTaskSchema.statics.searchScheduledTaskCount = function (searchCriteria) {
    let ScheduledTask = this;
    let count = 0;
    return ScheduledTask.find(searchCriteria).exec().then(searchResultArray => {
        if (searchResultArray) {
            count = searchResultArray.length;
        }
        return Promise.resolve(count);
    }).catch(err => Promise.reject(err));
};

scheduledTaskSchema.statics.searchScheduledTask = function (searchCriteria, pagination) {
    let ScheduledTask = this;
    return ScheduledTask.find(searchCriteria).limit(pagination.maxResult).skip((pagination.pageNumber - 1) * pagination.maxResult).sort({_id: 1}).exec().then(searchResultArray => {
        if (!searchResultArray) {
            searchResultArray = [];
        }
        return Promise.resolve(searchResultArray);
    }).catch(err => Promise.reject(err));
};

let ScheduledTask = mongoose.model('ScheduledTask', scheduledTaskSchema);


module.exports = {
    ScheduledTask
};