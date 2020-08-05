const {mongoose} = require('./../db/mongoose');
const {removeFromModel} = require('./../utils/utils');
const {PublishPostHistory} = require('./publish-post-history');
const {getCurrentDateTimeJson} = require('./../utils/utils');
const {Constant} = require('./../service/categories-service');

let PostSchema = new mongoose.Schema({
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
    title: {
        type: String,
        required: false,
        trim: true
    },
    originalContent: {
        type: String,
        required: false,
        trim: true
    },
    content: {
        type: String,
        required: true,
        trim: true
    },
    identifier: {
        type: Number,
        required: true
    },
    amount: {
        type: Number,
        required: false
    },
    favourite: {
        type: Boolean,
        required: true
    },
    attributes: [
        {
            _id: false,
            title: {
                type: String,
                trim: true
            },
            value: {
                type: String,
                trim: true
            }
        }
    ],
    account: {type: mongoose.Schema.ObjectId, ref: 'Account'},
    user: {type: mongoose.Schema.ObjectId, ref: 'User'},
    publishHistory: [{type: mongoose.Schema.ObjectId, ref: 'PublishPostHistory'}],
    channels: [{type: mongoose.Schema.ObjectId, ref: 'TelegramChannel'}],
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


PostSchema.methods.toJSON = function () {
    return removeFromModel(this, ['_id', 'user', '__v']);
};


PostSchema.methods.addPublishPostHistory = async function (identifier, channel) {
    let post = this;
    try {
        let data = {
            identifier: identifier,
            creationDateTime: getCurrentDateTimeJson(),
            lastUpdateDateTime: getCurrentDateTimeJson(),
            active: true,
            post: post,
            channel: channel
        };

        let publishPostHistory = new PublishPostHistory(data);
        await publishPostHistory.save();
        post.publishHistory.push(publishPostHistory);
        await post.save();
        return Promise.resolve(publishPostHistory);
    } catch (e) {
        return Promise.reject(e);
    }
};

PostSchema.statics.findPost = function (user, identifier) {
    let Post = this;
    return Post.findOne({identifier, user}).populate('publishHistory account').then((post) => {
        if (!post) {
            console.log("inja")
            console.log(user)
            console.log(identifier)
            return Promise.reject("INVALID IDENTIFIER");
        } else {
            return Promise.resolve(post);
        }
    });
};


PostSchema.statics.findNextIdentifier = function (user) {
    let Post = this;
    let nextIdentifier = 100;
    return Post.findOne().where({user: user}).sort({identifier: -1}).exec().then(result => {
        if (result) {
            nextIdentifier = result.identifier + 1;
        }
        return Promise.resolve(nextIdentifier);
    }).catch(err => Promise.reject(err));
};


PostSchema.statics.searchPostCount = function (searchCriteria) {
    let Post = this;
    let count = 0;
    return Post.find(searchCriteria).exec().then(searchResultArray => {
        if (searchResultArray) {
            count = searchResultArray.length;
        }
        return Promise.resolve(count);
    }).catch(err => Promise.reject(err));
};

PostSchema.statics.searchPost = function (searchCriteria, pagination) {
    let Post = this;
    return Post.find(searchCriteria).populate('publishHistory channels').limit(pagination.maxResult).skip((pagination.pageNumber - 1) * pagination.maxResult).sort({identifier: 1}).exec().then(searchResultArray => {
        if (!searchResultArray) {
            searchResultArray = [];
        }
        return Promise.resolve(searchResultArray);
    }).catch(err => Promise.reject(err));
};


PostSchema.statics.searchPost = function (searchCriteria, pagination) {
    let Post = this;
    return Post.find(searchCriteria).populate('publishHistory channels').limit(pagination.maxResult).skip((pagination.pageNumber - 1) * pagination.maxResult).sort({identifier: 1}).exec().then(searchResultArray => {
        if (!searchResultArray) {
            searchResultArray = [];
        }
        return Promise.resolve(searchResultArray);
    }).catch(err => Promise.reject(err));
};


PostSchema.statics.searchForAutoPost = function (favourite, numberOfPost) {
    let Post = this;
    return Post.find(
        {
            favourite: favourite,
            "status.name": {$nin: [Constant.DELETED_POST_STATUS, Constant.SOLD_POST_STATUS]}
        }
    ).populate('user publishHistory  channels').limit(numberOfPost).sort({
        lastUpdateDateTime: 1,
        identifier: 1
    }).exec().then(searchResultArray => {
        if (!searchResultArray) {
            searchResultArray = [];
        }
        return Promise.resolve(searchResultArray);
    }).catch(err => Promise.reject(err));
};


PostSchema.methods.updatePost = function (newInfo) {
    let post = this;
    return post.updateOne(newInfo);
};

PostSchema.statics.updatePostStatus = function (identifier, status) {
    let Post = this;
    return Post.updateOne({_id: identifier}, {lastUpdateDateTime: getCurrentDateTimeJson(), status: status});
};

PostSchema.statics.deletePost = function (identifier) {
    let Post = this;
    Post.findOne({identifier}).remove().exec();
    return Promise.resolve(identifier);
};

PostSchema.statics.loadById = function (id) {
    let Post = this;
    return Post.findOne({_id: id,}).populate('user');
};

let Post = mongoose.model('Post', PostSchema);


module.exports = {
    Post
};