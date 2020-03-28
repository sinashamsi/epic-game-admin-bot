const {mongoose} = require('./../db/mongoose');
const {getCurrentDateTime} = require('./../utils/utils');
const {getCategoryElement} = require('./../utils/categories');

let scheduledTaskSchema = new mongoose.Schema({
    executeDateTime: {
        type: String,
        required: true,
        trim: true
    },
    creationDateTime: {
        type: String,
        required: true,
        trim: true
    },
    lastUpdateDateTime: {
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
    return scheduledTask.updateOne({_id: id}, {lastUpdateDateTime: getCurrentDateTime(), status: status});
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
        status: getCategoryElement("REGISTERED_SCHEDULED_TASK_STATUS"),
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