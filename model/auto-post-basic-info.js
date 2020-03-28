const {mongoose} = require('./../db/mongoose');

let autoPostBasicInfoSchema = new mongoose.Schema({
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
    interval: {
        type: Number,
        required: true
    },
    numberOfNormalPost: {
        type: Number,
        required: true
    },
    numberOfFavouritePost: {
        type: Number,
        required: true
    },
    silent : {
        type: Boolean,
        required: true
    },
    active : {
        type: Boolean,
        required: true
    },
    user: {type: mongoose.Schema.ObjectId, ref: 'User'}
});


autoPostBasicInfoSchema.methods.updateBasicInfo = function (newInfo) {
    let autoPostBasicInfo = this;
    return autoPostBasicInfo.updateOne(newInfo);
};

autoPostBasicInfoSchema.statics.loadBasicInfo = function () {
    let autoPostBasicInfo = this;
    return autoPostBasicInfo.find({}).populate('user');
};

autoPostBasicInfoSchema.statics.loadBasicInfoByUser = function (user) {
    let autoPostBasicInfo = this;
    return autoPostBasicInfo.findOne({user});
};



let AutoPostBasicInfo = mongoose.model('AutoPostBasicInfo', autoPostBasicInfoSchema);


module.exports = {
    AutoPostBasicInfo
};