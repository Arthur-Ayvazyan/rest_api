const fs = require('fs');
const path = require('path');

const {validationResult} = require('express-validator/check');

const io = require('../socket');
const Post = require('../models/post');
const User = require('../models/user');

exports.getPosts = async (req, res, next) => {
    const currentPage = req.query.page || 1;
    const perPage = 2;

    try {
        const totalItems = await Post.find().countDocuments();
        const posts = await Post.find()
            .populate('creator')
            .sort({createdAt: -1})
            .skip((currentPage - 1) * perPage)
            .limit(perPage);

        res.status(200).json({
            message: 'Fetched posts successfully',
            posts,
            totalItems
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err)
    }
}

exports.createPost = async (req, res, next) => {

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

    let post = new Post({
        title,
        content,
        imageUrl,
        creator: req.userId,
    });

    try {
        post = await post.save();
        let user = await User.findById(req.userId);

        user.posts.push(post);
        await user.save();

        io.getIO().emit('posts', {
            action: 'create',
            post: {
                ...post._doc,
                creator: {_id: req.userId},
                name: user.name
            }
        });

        res.status(201).json({
            message: 'Post created successfully!',
            post,
            creator: {
                _id: user._id,
                name: user.name
            }
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err)
    }
}

exports.getPost = async (req, res, next) => {

    const postId = req.params.postId;

    try {
        const post = await Post.findById(postId);

        if (!post) {
            const error = new Error((`Post doesn't exist`));
            error.statusCode = 404;
            throw error;
        }
        res.status(200).json({message: 'Post post fetched', post})
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err)
    }
}

exports.updatePost = async (req, res, next) => {

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
    try {
        let post = await Post.findById(postId).populate('creator');

        if (!post) {
            const error = new Error((`Post doesn't exist`));
            error.statusCode = 404;
            throw error;
        }

        if (post.creator._id.toString() !== req.userId) {
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
        post = await post.save();

        io.getIO().emit('posts', {
            action: 'update',
            post: post
        });

        res.status(200).json({message: 'Updated successfully.', post})
    } catch (err) {
        next(err)
    }
}

exports.deletePost = async (req, res, next) => {

    const postId = req.params.postId;
    const post = await Post.findById(postId);

    if (!post) {
        const error = new Error((`Post doesn't exist`));
        error.statusCode = 404;
        throw error;
    }

    if (post.creator.toString() !== req.userId) {
        const error = new Error((`Not authorized!`));
        error.statusCode = 403;
        throw error;
    }

    clearImage(post.imageUrl);

    try {
        await Post.findByIdAndRemove(postId);
        let user = await User.findById(req.userId);
        user.posts.pull(postId);
        io.getIO().emit('posts', {
            action: 'delete',
            postId
        })
        res.status(200).json({message: 'Deleted post.'})
    } catch (err) {
        next(err)
    }
}

exports.getStatus = async (req, res, next) => {

    try{
        let user = await User.findById(req.userId);

        if (!user) {
            const error = new Error((`Not found!`));
            error.statusCode = 404;
            throw error;
        }
        res.status(200).json({message: 'Status fetched successfully.', status: user.status})
    }
    catch(err) {
        next(err);
    }
}

exports.updateStatus = async (req, res, next) => {

    const newStatus = req.body.status;
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        const error = new Error(('Update failed, empty field'));
        error.statusCode = 422;
        throw error;
    }

    try {
        let user = await User.findById(req.userId);
        if (!user) {
            const error = new Error((`Not found!`));
            error.statusCode = 404;
            throw error;
        }
        user.status = newStatus;
        await user.save();
        res.status(200).json({message: 'Status updated successfully.', newStatus});
    } catch (err) {
        next(err)
    }
}

const clearImage = filePath => {
    filePath = path.join(__dirname, '..', filePath);
    fs.unlink(filePath, err => console.log(err))
}