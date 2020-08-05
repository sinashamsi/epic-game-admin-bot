const {mongoose} = require('./../db/mongoose');

let autoPostBasicInfoSchema = new mongoose.Schema({
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
    user: {type: mongoose.Schema.ObjectId, ref: 'User'},
    channel: {type: mongoose.Schema.ObjectId, ref: 'TelegramChannel'}
});


autoPostBasicInfoSchema.methods.updateBasicInfo = function (newInfo) {
    let autoPostBasicInfo = this;
    return autoPostBasicInfo.updateOne(newInfo);
};

autoPostBasicInfoSchema.statics.loadBasicInfo = function () {
    let autoPostBasicInfo = this;
    return autoPostBasicInfo.find({}).populate('user channel');
};

autoPostBasicInfoSchema.statics.loadBasicInfoByChannel = function (channel) {
    let autoPostBasicInfo = this;
    return autoPostBasicInfo.findOne({channel});
};


autoPostBasicInfoSchema.statics.loadBasicInfoByUser = function (user) {
    let autoPostBasicInfo = this;
    return autoPostBasicInfo.find({user}).populate('channel');
};



let AutoPostBasicInfo = mongoose.model('AutoPostBasicInfo', autoPostBasicInfoSchema);


module.exports = {
    AutoPostBasicInfo
};