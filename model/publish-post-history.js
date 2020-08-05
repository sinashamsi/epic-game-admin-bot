const {mongoose} = require('./../db/mongoose');
const {removeFromModel, getCurrentDateTimeJson} = require('./../utils/utils');

let publishPostHistorySchema = new mongoose.Schema({
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
    identifier: {
        type: String,
        required: true,
        trim: true
    },
    active: {
        type: Boolean,
        required: true
    },
    post: {type: mongoose.Schema.ObjectId, ref: 'Post'} ,
    channel: {type: mongoose.Schema.ObjectId, ref: 'TelegramChannel'}
});

publishPostHistorySchema.methods.toJSON = function () {
    return removeFromModel(this, ['_id']);
};

publishPostHistorySchema.statics.updateLastUpdateDateTime = function (identifier) {
    let PublishPostHistory = this;
    return PublishPostHistory.updateOne({_id: identifier}, {lastUpdateDateTime: getCurrentDateTimeJson()});
};

publishPostHistorySchema.statics.makeDeActivePublishPostHistory = function (identifier) {
    let PublishPostHistory = this;
    return PublishPostHistory.updateOne({_id: identifier}, {lastUpdateDateTime: getCurrentDateTimeJson(), active: false});
};


publishPostHistorySchema.statics.loadById = function (id) {
    let publishPostHistory = this;
    return publishPostHistory.findOne({
        _id: id,
    }).populate('channel');
};


publishPostHistorySchema.statics.loadAllActivePostInfo = function () {
    let publishPostHistory = this;
    return publishPostHistory.find({active: true}).populate('channel');
};



let PublishPostHistory = mongoose.model('PublishPostHistory', publishPostHistorySchema);


module.exports = {
    PublishPostHistory
};