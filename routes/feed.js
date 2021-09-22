const express = require('express');
const {body} = require('express-validator/check');

const router = express.Router();

const isAuth = require('../middleware/is-auth');

const feedController = require('../controllers/feed');

// GET /feed/posts
router.get('/posts', isAuth, feedController.getPosts)

// POST /feed/post
router.post(
    '/post',
    isAuth,
    [
        body('title')
            .trim()
            .isLength({min: 5}),
        body('content')
            .trim()
            .isLength({min: 5}),
    ],
    feedController.createPost
)

// GET /feed/post:postId
router.get('/post/:postId', isAuth, feedController.getPost)

// PUT /feed/post:postId
router.put(
    '/post/:postId',
    isAuth,
    [
        body('title')
            .trim()
            .isLength({min: 5}),
        body('content')
            .trim()
            .isLength({min: 5}),
    ],
    feedController.updatePost
);

// DELETE /feed/post:postId
router.delete('/post/:postId', isAuth, feedController.deletePost);

// GET /feed/user/status
router.get('/user/status', isAuth, feedController.getStatus)

// UPDATE /feed/user/status
router.patch(
    '/user/status',
    isAuth,
    [
        body('status')
            .trim()
            .not()
            .isEmpty()
            .withMessage(`Status shouldn't be empty`)
    ],
    feedController.updateStatus
)

module.exports = router;