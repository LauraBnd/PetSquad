const express = require('express');
const authController = require('../controllers/authController');
const { deleteAccount } = require('../controllers/authController');
const router = express.Router();

const requireAuth = (req, res, next) => {
    if (req.session.userId) {
        next();
    } else {
        res.status(401).json({ 
            success: false, 
            message: 'Authentication required' 
        });
    }
};

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.get('/current-user', authController.getCurrentUser);
router.put('/profile', authController.updateProfile);
router.put('/change-password', authController.changePassword);
router.delete('/delete-account', requireAuth, authController.deleteAccount);



// Add this route to your existing routes


module.exports = router;