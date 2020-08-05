const {mongoose} = require('./../db/mongoose');
const {getCurrentDateTimeJson} = require('./../utils/utils');

let verificationSchema = new mongoose.Schema({
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
    mobileNumber: {
        type: String,
        required: true,
        trim: true
    },
    action: {
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
    },
    code: {
        type: String,
        required: true,
        trim: true
    },
    verified: {
        type: Boolean,
        required: true
    },
    actionKey: {
        type: String,
        trim: true
    }
});

verificationSchema.statics.loadLastNotVerifiedVerification = function (mobileNumber, actionName) {
    let verification = this;
    let query = {
        "mobileNumber": mobileNumber,
        "action.name": actionName,
        "verified": false
    };
    return verification.findOne(query).sort({creationDateTime: -1});
};

verificationSchema.statics.loadLastVerifiedVerification = function (mobileNumber, actionName, actionKey) {
    let verification = this;
    let query = {
        "mobileNumber": mobileNumber,
        "action.name": actionName,
        "actionKey": actionKey,
        "verified": true
    };
    return verification.findOne(query).sort({creationDateTime: -1});
};

verificationSchema.statics.verify = function (identifier, actionKey) {
    let verification = this;
    return verification.updateOne({_id: identifier}, {
        lastUpdateDateTime: getCurrentDateTimeJson(),
        verified: true,
        actionKey: actionKey
    });
};


let Verification = mongoose.model('Verification', verificationSchema);

module.exports = {
    Verification
};