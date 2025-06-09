const express = require('express');
const postController = require('../controllers/postController');

const router = express.Router();

router.post('/', postController.uploadMiddleware, postController.createPost);
router.get('/', postController.getAllPosts);
router.get('/user', postController.getUserPosts);
router.get('/alerts', postController.getUserAlerts);
router.get('/pending-alert', postController.checkPendingAlert);

// NEW: Edit post routes
router.get('/edit/:id', postController.getPostForEdit);
router.put('/edit/:id', postController.uploadMiddleware, postController.updatePost);
router.delete('/:id/image/:imagePath', postController.deletePostImage);

router.get('/:id', postController.getPostById);
router.delete('/:id', postController.deletePost);
router.put('/:id/solved', postController.markPostSolved);
router.post('/alert', postController.sendAlert);
router.put('/alert/:id/read', postController.markAlertRead);

module.exports = router;