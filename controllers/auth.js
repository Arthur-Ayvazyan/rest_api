const {validationResult} = require('express-validator/check');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user');

exports.signUp = (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        const error = new Error('Validation failed.')
        error.status = 422;
        error.data = errors.array();
        throw error
    }
    const {email, name, password} = req.body;

    bcrypt.hash(password, 12)
        .then(hashedPass => {
            const user = new User({
                email,
                password: hashedPass,
                name
            });
            return user.save()
        })
        .then(result => {
            res.status(201).json({
                message: 'User created',
                userId: result._id
            })
        })
        .catch(err => {
            if (!err.statusCode) {
                err.statusCode = 500;
            }
            next(err)
        })
}

exports.login = (req, res, next) => {
    const {email, password} = req.body;
    let loadedUser;
    User.findOne({email: email})
        .then(user => {
            if (!user) {
                const error = new Error('Wrong login or password.')
                error.status = 401;
                throw error
            }

            loadedUser = user;
            return bcrypt.compare(password, user.password)
        })
        .then(isEqual => {
            if (!isEqual) {
                const error = new Error('Wrong login or password.')
                error.status = 401;
                throw error
            }

            const token = jwt.sign(
                {
                    email: loadedUser.email,
                    userId: loadedUser._id.toString(),
                },
                'secret',
                {expiresIn: '1h'}
            );
            res.status(200).json({token: token, userId: loadedUser._id.toString()})
        })
        .catch(err => {
            if (!err.statusCode) {
                err.statusCode = 500;
            }
            next(err)
        })
}