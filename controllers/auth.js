const {validationResult} = require('express-validator/check');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user');

exports.signUp = async (req, res, next) => {

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        const error = new Error('Validation failed.')
        error.status = 422;
        error.data = errors.array();
        throw error
    }
    const {email, name, password} = req.body

    try{
        const hashedPass = await bcrypt.hash(password, 12);
        let user = new User({
            email,
            password: hashedPass,
            name
        });
        user = await user.save();
        res.status(201).json({
            message: 'User created',
            userId: user._id
        });

    }  catch(err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err)
    }
}

exports.login = async (req, res, next) => {

    const {email, password} = req.body;

    try{
        const user = await User.findOne({email: email});
        if (!user) {
            const error = new Error('Wrong login or password.')
            error.status = 401;
            throw error
        }

        const isEqualPassword = await bcrypt.compare(password, user.password);

        if (!isEqualPassword) {
            const error = new Error('Wrong login or password.')
            error.status = 401;
            throw error
        }

        const token = jwt.sign(
            {
                email: user.email,
                userId: user._id.toString(),
            },
            'secret',
            {expiresIn: '1h'}
        );

        res.status(200).json({token: token, userId: user._id.toString()})

    } catch(err)  {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err)
    }
}