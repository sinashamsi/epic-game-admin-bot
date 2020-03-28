const bcrypt = require('bcryptjs');
const _ = require('lodash');
const jwt = require('jsonwebtoken');
const config = require('config');

const {mongoose} = require('../db/mongoose');

let UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        minlength: 3,
        trim: true
    },
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    password: {
        type: String,
        minlength: 6,
        required: true
    },
    channelChatIdentifier: {
        type: String,
        required: true
    },
    adminChatIdentifier: {
        type: String,
        required: true
    },
    tokens: [{
        _id: false,
        token: {
            type: String,
            required: true
        }
    }]
});

UserSchema.methods.toJSON = function () {
    let user = this;
    let userObject = user.toObject();
    return _.pick(userObject, ['name', 'username']);
};

UserSchema.statics.findByCredentials = function (username, password) {
    let User = this;

    return User.findOne({username}).then((user) => {
        if (!user) {
            return Promise.reject();
        }
        return new Promise((resolve, reject) => {
            bcrypt.compare(password, user.password, (err, res) => {
                if (res) {
                    resolve(user);
                } else {
                    reject();
                }
            });
        });
    });
};

UserSchema.statics.findByToken = function (token) {
    let User = this;
    let decoded;

    try {
        decoded = jwt.verify(token, config.get('JWT_SECRET'));
    } catch (e) {
        return Promise.reject();
    }

    return User.findOne({
        _id: decoded._id,
        'tokens.token': token
    });
};

UserSchema.methods.removeToken = function () {
    let user = this;
    return user.updateOne({tokens: []});
};

UserSchema.methods.generateAuthToken = function () {
    let user = this;
    let token = jwt.sign({_id: user._id.toHexString()}, config.get('JWT_SECRET')).toString();
    user.tokens.push({token});
    return user.save().then(() => {
        return token;
    });
};

UserSchema.pre('save', function (next) {
    let user = this;

    if (user.isModified('password')) {
        bcrypt.genSalt(10, (err, salt) => {
            bcrypt.hash(user.password, salt, (err, hash) => {
                user.password = hash;
                next();
            });
        });
    } else {
        next();
    }
});

let User = mongoose.model('User', UserSchema);

module.exports = {
    User
};