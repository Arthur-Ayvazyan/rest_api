const fs = require('fs');
const path = require('path');

const {validationResult} = require('express-validator/check');

const Post = require('../models/post');
const User = require('../models/user');

exports.getPosts = (req, res, next) => {
    const currentPage = req.query.page || 1;
    const perPage = 2;
    let totalItems;

    Post.find()
        .countDocuments()
        .then(count => {
            totalItems = count;
            return Post.find()
                .skip((currentPage - 1) * perPage)
                .limit(perPage)
        })
        .then(posts => {
            res.status(200).json({message: 'Fetched posts successfully', posts, totalItems})
        })
        .catch(err => {
            if (!err.statusCode) {
                err.statusCode = 500;
            }
            next(err)
        })
}

exports.createPost = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const error = new Error(('Validation failed, entered data is incorrect'));
        error.statusCode = 422;
        throw error;
    }

    if (!req.file) {
        const error = new Error('No image provided.');
        error.code = 422;
        throw error;
    }

    const imageUrl = req.file.path;
    const {title, content} = req.body;
    let creator;
    const post = new Post({
        title,
        content,
        imageUrl,
        creator: req.userId,
    });
    post.save()
        .then(result => {
            return User.findById(req.userId)
        })
        .then(user => {
            creator = user;
            user.posts.push(post);
            return user.save()
        })
        .then(result => {
            res.status(201).json({
                message: 'Post created successfully!',
                post: post,
                creator: {
                    _id: creator._id,
                    name: creator.name
                }
            });
        })
        .catch(err => {
            if (!err.statusCode) {
                err.statusCode = 500;
            }
            next(err)
        });
}

exports.getPost = (req, res, next) => {
    const postId = req.params.postId;
    Post.findById(postId)
        .then(post => {
            if (!post) {
                const error = new Error((`Post doesn't exist`));
                error.statusCode = 404;
                throw error;
            }
            res.status(200).json({message: 'Post post fetched', post: post})
        })
        .catch(err => {
            if (!err.statusCode) {
                err.statusCode = 500;
            }
            next(err)
        })
}

exports.updatePost = (req, res, next) => {
    const postId = req.params.postId;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const error = new Error(('Validation failed, entered data is incorrect'));
        error.statusCode = 422;
        throw error;
    }

    const {title, content} = req.body;
    let imageUrl = req.body.image;

    if (req.file) {
        imageUrl = req.file.path;
    }

    if (!imageUrl) {
        const error = new Error('No file picked.');
        error.statusCode = 422;
        throw error;
    }

    Post.findById(postId)
        .then(post => {
            if (!post) {
                const error = new Error((`Post doesn't exist`));
                error.statusCode = 404;
                throw error;
            }

            if(post.creator.toString() !== req.userId) {
                const error = new Error((`Not authorized!`));
                error.statusCode = 403;
                throw error;
            }

            if (imageUrl !== post.imageUrl) {
                clearImage(post.imageUrl)
            }

            post.title = title;
            post.imageUrl = imageUrl;
            post.content = content;
            return post.save()
        })
        .then(result => {
            res.status(200).json({
                message: 'Updated successfully.',
                post: result
            })
        })
        .catch(err => next(err))
}

exports.deletePost = (req, res, next) => {
    const postId = req.params.postId;
    Post.findById(postId)
        .then(post => {

            if (!post) {
                const error = new Error((`Post doesn't exist`));
                error.statusCode = 404;
                throw error;
            }

            if(post.creator.toString() !== req.userId) {
                const error = new Error((`Not authorized!`));
                error.statusCode = 403;
                throw error;
            }
            // Check logged in user
            clearImage(post.imageUrl);

            return Post.findByIdAndRemove(postId)
        })
        .then(result => {
            return User.findById(req.userId)
        })
        .then(user => {
            user.posts.pull(postId)
            user.save();
        })
        .then(result => {
            res.status(200).json({message: 'Deleted post.'})
        })
        .catch(err => next(err))
}

exports.getStatus = (req, res, next) => {
    User.findById(req.userId)
        .then(user => {
            if(!user) {
                const error = new Error((`Not found!`));
                error.statusCode = 404;
                throw error;
            }
            res.status(200).json({message: 'Status fetched successfully.', status: user.status})
        })
        .catch(err => next(err))
}

exports.updateStatus = (req, res, next) => {
    const newStatus = req.body.status;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const error = new Error(('Update failed, empty field'));
        error.statusCode = 422;
        throw error;
    }

    User.findById(req.userId)
        .then(user => {
            if(!user) {
                const error = new Error((`Not found!`));
                error.statusCode = 404;
                throw error;
            }
            user.status = newStatus;
            return user.save()
        })
        .then(result => {
            res.status(200).json({message: 'Status updated successfully.', newStatus})
        })
        .catch(err => next(err))
}

const clearImage = filePath => {
    filePath = path.join(__dirname, '..', filePath);
    fs.unlink(filePath, err => console.log(err))
}