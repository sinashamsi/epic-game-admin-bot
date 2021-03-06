const {mongoose} = require('./../db/mongoose');

let educationSchema = new mongoose.Schema({
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
    question: {
        type: String,
        required: true,
        trim: true
    },
    answer: {
        type: String,
        required: true,
        trim: true
    }
});


educationSchema.methods.updateEducation = function (newInfo) {
    let education = this;
    return education.updateOne(newInfo);
};

educationSchema.statics.loadAllEducationInfo = function () {
    let education = this;
    return education.find({});
};

educationSchema.statics.loadById = function (identifier) {
    let education = this;
    return education.findOne({_id: identifier}).then((educationInfo) => {
        if (!educationInfo) {
            return Promise.reject("INVALID IDENTIFIER");
        } else {
            return Promise.resolve(educationInfo);
        }
    });
};

let Education = mongoose.model('Education', educationSchema);

module.exports = {
    Education
};