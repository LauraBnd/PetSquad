const Post = require('../models/post');
const Alert = require('../models/alert');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file uploads
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

const postController = {
  uploadMiddleware: upload,

  async createPost(req, res) {
    try {
      console.log('=== CREATE POST DEBUG ===');
      console.log('Session:', req.session);
      console.log('Body:', req.body);
      console.log('Files:', req.files);
      
      if (!req.session.userId) {
        console.log('ERROR: Not authenticated');
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const { tag, petName, location, date, breed, size, description } = req.body;

      console.log('Extracted data:', { tag, petName, location, date, breed, size, description });

      // Validate required fields
      if (!tag || !location || !date || !size) {
        console.log('ERROR: Missing required fields');
        console.log('Required check:', { tag: !!tag, location: !!location, date: !!date, size: !!size });
        return res.status(400).json({ 
          error: 'Missing required fields',
          details: {
            tag: !tag ? 'Tag is required' : null,
            location: !location ? 'Location is required' : null,
            date: !date ? 'Date is required' : null,
            size: !size ? 'Size is required' : null
          }
        });
      }

      // Validate petName for lost pets
      if (tag === 'lost' && !petName) {
        console.log('ERROR: Pet name required for lost pets');
        return res.status(400).json({ error: 'Pet name is required for lost pets' });
      }

      const imagePaths = req.files && req.files.images ? req.files.images.map(file => file.path) : [];
      console.log('Image paths:', imagePaths);

      const postData = {
        userId: req.session.userId,
        tag,
        petName: tag === 'lost' ? petName : null,
        location,
        date,
        breed: breed || null, // Handle empty breed
        size,
        description: description || null // Handle empty description
      };

      console.log('Final post data:', postData);

      const postId = await Post.create(postData, imagePaths);
      console.log('Post created successfully with ID:', postId);

      res.status(201).json({ 
        message: 'Post created successfully',
        postId 
      });
    } catch (error) {
      console.error('=== CREATE POST ERROR ===');
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      console.error('Error details:', error);
      
      // Check for specific database errors
      if (error.code === 'ER_NO_SUCH_TABLE') {
        return res.status(500).json({ error: 'Database table does not exist' });
      }
      if (error.code === 'ER_BAD_FIELD_ERROR') {
        return res.status(500).json({ error: 'Database column does not exist' });
      }
      if (error.code === 'ER_DATA_TOO_LONG') {
        return res.status(400).json({ error: 'Data too long for database field' });
      }
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ error: 'Duplicate entry' });
      }
      
      res.status(500).json({ 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // NEW: Get post for editing
  async getPostForEdit(req, res) {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const { id } = req.params;
      const post = await Post.findById(id);
      
      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }

      // Check if user owns the post
      if (post.user_id !== req.session.userId) {
        return res.status(403).json({ error: 'Not authorized to edit this post' });
      }

      res.json(post);
    } catch (error) {
      console.error('Get post for edit error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // NEW: Update post
  async updatePost(req, res) {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const { id } = req.params;
      const { tag, petName, location, date, breed, size, description } = req.body;

      // Check if post exists and belongs to user
      const existingPost = await Post.findById(id);
      if (!existingPost) {
        return res.status(404).json({ error: 'Post not found' });
      }
      if (existingPost.user_id !== req.session.userId) {
        return res.status(403).json({ error: 'Not authorized to edit this post' });
      }

      // Validate required fields
      if (!tag || !location || !date || !size) {
        return res.status(400).json({ 
          error: 'Missing required fields',
          details: {
            tag: !tag ? 'Tag is required' : null,
            location: !location ? 'Location is required' : null,
            date: !date ? 'Date is required' : null,
            size: !size ? 'Size is required' : null
          }
        });
      }

      // Validate petName for lost pets
      if (tag === 'lost' && !petName) {
        return res.status(400).json({ error: 'Pet name is required for lost pets' });
      }

      const newImagePaths = req.files && req.files.images ? req.files.images.map(file => file.path) : [];

      const postData = {
        tag,
        petName: tag === 'lost' ? petName : null,
        location,
        date,
        breed: breed || null,
        size,
        description: description || null
      };

      const updated = await Post.updateById(id, postData, newImagePaths);
      
      if (updated) {
        // Get updated post to return
        const updatedPost = await Post.findById(id);
        res.json({ 
          message: 'Post updated successfully',
          post: updatedPost 
        });
      } else {
        res.status(400).json({ error: 'Failed to update post' });
      }
    } catch (error) {
      console.error('Update post error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // NEW: Delete specific image from post
  async deletePostImage(req, res) {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const { id, imagePath } = req.params;
      
      // Check if post belongs to user
      const post = await Post.findById(id);
      if (!post || post.user_id !== req.session.userId) {
        return res.status(403).json({ error: 'Not authorized to edit this post' });
      }

      // Delete from database
      const deleted = await Post.deleteImage(id, imagePath);
      
      if (deleted) {
        // Delete physical file
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
        res.json({ message: 'Image deleted successfully' });
      } else {
        res.status(400).json({ error: 'Failed to delete image' });
      }
    } catch (error) {
      console.error('Delete post image error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async getAllPosts(req, res) {
    try {
      const filters = {
        tag: req.query.tag,
        size: req.query.size,
        breed: req.query.breed,
        keywords: req.query.keywords,
        startingFrom: req.query.startingFrom
      };

      // Remove undefined filters
      Object.keys(filters).forEach(key => {
        if (!filters[key]) delete filters[key];
      });

      const posts = await Post.findAll(filters);
      res.json(posts);
    } catch (error) {
      console.error('Get all posts error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async getPostById(req, res) {
    try {
      const { id } = req.params;
      const post = await Post.findById(id);
      
      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }

      res.json(post);
    } catch (error) {
      console.error('Get post by ID error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async getUserPosts(req, res) {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const posts = await Post.findByUserId(req.session.userId);
      res.json(posts);
    } catch (error) {
      console.error('Get user posts error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async deletePost(req, res) {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const { id } = req.params;
      
      // Check if post belongs to user
      const post = await Post.findById(id);
      if (!post || post.user_id !== req.session.userId) {
        return res.status(403).json({ error: 'Not authorized to delete this post' });
      }

      // Delete associated images
      if (post.images) {
        post.images.forEach(imagePath => {
          if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
          }
        });
      }

      const deleted = await Post.deleteById(id);
      
      if (deleted) {
        res.json({ message: 'Post deleted successfully' });
      } else {
        res.status(400).json({ error: 'Failed to delete post' });
      }
    } catch (error) {
      console.error('Delete post error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async markPostSolved(req, res) {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const { id } = req.params;
      
      // Check if post belongs to user
      const post = await Post.findById(id);
      if (!post || post.user_id !== req.session.userId) {
        return res.status(403).json({ error: 'Not authorized to mark this post as solved' });
      }

      const updated = await Post.markAsSolved(id);
      
      if (updated) {
        res.json({ message: 'Post marked as solved' });
      } else {
        res.status(400).json({ error: 'Failed to mark post as solved' });
      }
    } catch (error) {
      console.error('Mark post solved error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async sendAlert(req, res) {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const { postId, message } = req.body;

      if (!postId) {
        return res.status(400).json({ error: 'Post ID required' });
      }

      const post = await Post.findById(postId);
      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }

      // Can't send alert to own post
      if (post.user_id === req.session.userId) {
        return res.status(400).json({ error: 'Cannot send alert to your own post' });
      }

      const alertId = await Alert.create({
        senderId: req.session.userId,
        receiverId: post.user_id,
        postId: postId,
        message: message || `Hi, @${post.username}! You just got an alert from @${req.session.username}. Contact them for more details.`
      });

      res.status(201).json({ 
        message: 'Alert sent successfully',
        alertId 
      });
    } catch (error) {
      console.error('Send alert error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async getUserAlerts(req, res) {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const alerts = await Alert.findByReceiverId(req.session.userId);
      res.json(alerts);
    } catch (error) {
      console.error('Get user alerts error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async checkPendingAlert(req, res) {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const pendingAlert = await Alert.checkPendingAlert(req.session.userId);
      res.json(pendingAlert);
    } catch (error) {
      console.error('Check pending alert error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async markAlertRead(req, res) {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const { id } = req.params;
      const updated = await Alert.markAsRead(id);
      
      if (updated) {
        res.json({ message: 'Alert marked as read' });
      } else {
        res.status(400).json({ error: 'Failed to mark alert as read' });
      }
    } catch (error) {
      console.error('Mark alert read error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};

module.exports = postController;