const {mongoose} = require('./../db/mongoose');
const {removeFromModel, getCurrentDateTime} = require('./../utils/utils');

let publishPostHistorySchema = new mongoose.Schema({
    identifier: {
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
        trim: true
    },
    active: {
        type: Boolean,
        required: true
    },
    post: {type: mongoose.Schema.ObjectId, ref: 'Post'}
});

publishPostHistorySchema.methods.toJSON = function () {
    return removeFromModel(this, ['_id']);
};

publishPostHistorySchema.statics.updateLastUpdateDateTime = function (identifier) {
    let PublishPostHistory = this;
    return PublishPostHistory.updateOne({_id: identifier}, {lastUpdateDateTime: getCurrentDateTime()});
};

publishPostHistorySchema.statics.makeDeActivePublishPostHistory = function (identifier) {
    let PublishPostHistory = this;
    return PublishPostHistory.updateOne({_id: identifier}, {lastUpdateDateTime: getCurrentDateTime(), active: false});
};


publishPostHistorySchema.statics.loadById = function (id) {
    let publishPostHistory = this;
    return publishPostHistory.findOne({
        _id: id,
    });
};

publishPostHistorySchema.statics.findActivePost = function () {
    let publishPostHistory = this;
    return publishPostHistory.find({
        active: true,
    }).populate('post');
};


let PublishPostHistory = mongoose.model('PublishPostHistory', publishPostHistorySchema);


module.exports = {
    PublishPostHistory
};