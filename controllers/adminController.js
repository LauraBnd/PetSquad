const User = require('../models/user');
const Post = require('../models/post');
const Alert = require('../models/alert');
const fs = require('fs');

const adminController = {
  async checkAdminAuth(req, res, next) {
    try {
      if (!req.session.userId || !req.session.isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
      }
      next();
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async getDashboardStats(req, res) {
    try {
      const solvedCount = await Post.getSolvedCount();
      const totalUsers = await User.getAll();
      const allPosts = await Post.getAll();
      
      res.json({
        solvedPosts: solvedCount,
        totalUsers: totalUsers ? totalUsers.length : 0,
        totalPosts: allPosts.length,
        activePosts: allPosts.filter(post => !post.is_solved).length
      });
    } catch (error) {
      console.error('Get dashboard stats error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async searchUsers(req, res) {
    try {
      const { query } = req.query;
      let users = await User.getAll();
      
      if (query) {
        users = users.filter(user => 
          user.username.toLowerCase().includes(query.toLowerCase()) ||
          user.email.toLowerCase().includes(query.toLowerCase()) ||
          (user.full_name && user.full_name.toLowerCase().includes(query.toLowerCase()))
        );
      }
      
      res.json(users);
    } catch (error) {
      console.error('Search users error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async searchPosts(req, res) {
    try {
      const { query, tag } = req.query;
      let posts = await Post.getAll();
      
      if (query) {
        posts = posts.filter(post => 
          (post.pet_name && post.pet_name.toLowerCase().includes(query.toLowerCase())) ||
          post.location.toLowerCase().includes(query.toLowerCase()) ||
          (post.breed && post.breed.toLowerCase().includes(query.toLowerCase())) ||
          (post.description && post.description.toLowerCase().includes(query.toLowerCase())) ||
          post.username.toLowerCase().includes(query.toLowerCase())
        );
      }
      
      if (tag) {
        posts = posts.filter(post => post.tag === tag);
      }
      
      res.json(posts);
    } catch (error) {
      console.error('Search posts error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // NEW: Admin get post for editing (no ownership check)
  async getPostForAdminEdit(req, res) {
    try {
      const { id } = req.params;
      const post = await Post.findById(id);
      
      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }

      // Admin can edit any post, no ownership check needed
      res.json(post);
    } catch (error) {
      console.error('Get post for admin edit error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // NEW: Admin update post (no ownership check)
  async adminUpdatePost(req, res) {
  try {
    console.log('=== ADMIN UPDATE POST DEBUG ===');
    console.log('Post ID:', req.params.id);
    console.log('Body:', req.body);
    console.log('Files:', req.files);
    console.log('Session:', req.session);

    const { id } = req.params;
    const { tag, petName, location, date, breed, size, description, markSolved } = req.body;

    // Check if post exists
    const existingPost = await Post.findById(id);
    if (!existingPost) {
      console.log('ERROR: Post not found');
      return res.status(404).json({ error: 'Post not found' });
    }

    console.log('Existing post found:', existingPost);

    // Validate required fields
    if (!tag || !location || !date || !size) {
      console.log('ERROR: Missing required fields');
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

    const newImagePaths = req.files && req.files.images ? req.files.images.map(file => file.path) : [];
    console.log('New image paths:', newImagePaths);

    const postData = {
      tag,
      petName: tag === 'lost' ? petName : null,
      location,
      date,
      breed: breed || null,
      size,
      description: description || null
    };

    console.log('Post data to update:', postData);

    const updated = await Post.updateById(id, postData, newImagePaths);
    console.log('Update result:', updated);
    
    if (updated) {
      // Handle mark as solved if requested
      if (markSolved === 'true' || markSolved === true || markSolved === 'on') {
        console.log('Marking post as solved');
        await Post.markAsSolved(id);
      }

      // Get updated post to return
      const updatedPost = await Post.findById(id);
      console.log('Final updated post:', updatedPost);
      
      res.json({ 
        message: 'Post updated successfully by admin',
        post: updatedPost 
      });
    } else {
      console.log('ERROR: Failed to update post');
      res.status(400).json({ error: 'Failed to update post' });
    }
  } catch (error) {
    console.error('=== ADMIN UPDATE POST ERROR ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Error details:', error);
    
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
},

  // NEW: Admin delete image from post (no ownership check)
  async adminDeletePostImage(req, res) {
    try {
      const { id, imagePath } = req.params;
      
      // Check if post exists (no ownership check for admin)
      const post = await Post.findById(id);
      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }

      // Delete from database
      const deleted = await Post.deleteImage(id, imagePath);
      
      if (deleted) {
        // Delete physical file
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
        res.json({ message: 'Image deleted successfully by admin' });
      } else {
        res.status(400).json({ error: 'Failed to delete image' });
      }
    } catch (error) {
      console.error('Admin delete post image error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async deleteUser(req, res) {
    try {
      const { id } = req.params;
      
      // Prevent admin from deleting themselves
      if (parseInt(id) === req.session.userId) {
        return res.status(400).json({ error: 'Cannot delete your own account' });
      }
      
      const deleted = await User.deleteById(id);
      
      if (deleted) {
        res.json({ message: 'User deleted successfully' });
      } else {
        res.status(400).json({ error: 'Failed to delete user' });
      }
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async deletePost(req, res) {
    try {
      const { id } = req.params;
      
      // Get post details for cleanup
      const post = await Post.findById(id);
      if (post && post.images) {
        // Delete associated image files
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

  async updateUserProfile(req, res) {
    try {
      const { id } = req.params;
      const { username, email, fullName, phoneNumber } = req.body;
      
      // Check if new username/email already exists (excluding current user)
      if (username) {
        const existingUser = await User.findByUsername(username);
        if (existingUser && existingUser.id !== parseInt(id)) {
          return res.status(400).json({ error: 'Username already exists' });
        }
      }

      if (email) {
        const existingUser = await User.findByEmail(email);
        if (existingUser && existingUser.id !== parseInt(id)) {
          return res.status(400).json({ error: 'Email already exists' });
        }
      }

      const updated = await User.updateProfile(id, {
        username,
        email,
        fullName,
        phoneNumber
      });

      if (updated) {
        res.json({ message: 'User profile updated successfully' });
      } else {
        res.status(400).json({ error: 'Failed to update user profile' });
      }
    } catch (error) {
      console.error('Update user profile error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async getAllAlerts(req, res) {
    try {
      // This would require a new method in Alert model to get all alerts
      // For now, return empty array
      res.json([]);
    } catch (error) {
      console.error('Get all alerts error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};

module.exports = adminController;