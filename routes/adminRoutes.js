const express = require('express');
const adminController = require('../controllers/adminController');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Configure multer for admin file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = 'uploads/posts';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
}).fields([
  { name: 'images', maxCount: 5 }
]);

// Apply admin auth middleware to all routes
router.use(adminController.checkAdminAuth);

// Existing routes
router.get('/stats', adminController.getDashboardStats);
router.get('/users', adminController.searchUsers);
router.get('/posts', adminController.searchPosts);
router.get('/alerts', adminController.getAllAlerts);
router.delete('/users/:id', adminController.deleteUser);
router.delete('/posts/:id', adminController.deletePost);
router.put('/users/:id', adminController.updateUserProfile);

// NEW: Admin edit post routes
router.get('/posts/edit/:id', adminController.getPostForAdminEdit);
router.put('/posts/edit/:id', upload, adminController.adminUpdatePost);
router.delete('/posts/:id/image/:imagePath', adminController.adminDeletePostImage);

module.exports = router;