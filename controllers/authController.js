const User = require('../models/user');
const bcrypt = require('bcrypt');

const authController = {
  async register(req, res) {
    try {
      const { username, email, password, fullName, phoneNumber } = req.body;

      // Validate input
      if (!username || !email || !password) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Check if user exists
      const existingUserByEmail = await User.findByEmail(email);
      if (existingUserByEmail) {
        return res.status(400).json({ error: 'Email already exists' });
      }

      const existingUserByUsername = await User.findByUsername(username);
      if (existingUserByUsername) {
        return res.status(400).json({ error: 'Username already exists' });
      }

      // Create user
      const userId = await User.create({
        username,
        email,
        password,
        fullName,
        phoneNumber
      });

      // Set session
      req.session.userId = userId;
      req.session.username = username;

      res.status(201).json({ 
        message: 'User created successfully',
        user: { id: userId, username, email, fullName }
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async login(req, res) {
    try {
      const { email, password, keepSignedIn } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
      }

      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const isPasswordValid = await User.verifyPassword(password, user.password_hash);
      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Set session
      req.session.userId = user.id;
      req.session.username = user.username;
      req.session.isAdmin = user.is_admin;

      // Set persistent cookie if requested
      if (keepSignedIn) {
        req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
      }

      res.json({ 
        message: 'Login successful',
        user: { 
          id: user.id, 
          username: user.username, 
          email: user.email,
          fullName: user.full_name,
          phoneNumber: user.phone_number,
          isAdmin: user.is_admin
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async logout(req, res) {
    try {
      req.session.destroy((err) => {
        if (err) {
          return res.status(500).json({ error: 'Could not logout' });
        }
        res.clearCookie('connect.sid');
        res.json({ message: 'Logout successful' });
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async getCurrentUser(req, res) {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const user = await User.findById(req.session.userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.full_name,
        phoneNumber: user.phone_number,
        isAdmin: user.is_admin
      });
    } catch (error) {
      console.error('Get current user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async updateProfile(req, res) {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const { username, email, fullName, phoneNumber } = req.body;

      // Check if new username/email already exists
      if (username) {
        const existingUser = await User.findByUsername(username);
        if (existingUser && existingUser.id !== req.session.userId) {
          return res.status(400).json({ error: 'Username already exists' });
        }
      }

      if (email) {
        const existingUser = await User.findByEmail(email);
        if (existingUser && existingUser.id !== req.session.userId) {
          return res.status(400).json({ error: 'Email already exists' });
        }
      }

      const updateData = {
        username,
        email,
        fullName,
        phoneNumber
      };

      const updated = await User.updateProfile(req.session.userId, updateData);

      if (updated) {
        if (username) req.session.username = username;
        
        // Get updated user data to return
        const updatedUser = await User.findById(req.session.userId);
        
        res.json({ 
          message: 'Profile updated successfully',
          user: {
            id: updatedUser.id,
            username: updatedUser.username,
            email: updatedUser.email,
            fullName: updatedUser.full_name,
            phoneNumber: updatedUser.phone_number
          }
        });
      } else {
        res.status(400).json({ error: 'Failed to update profile' });
      }
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async changePassword(req, res) {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Both passwords required' });
      }

      const user = await User.findById(req.session.userId);
      const isCurrentPasswordValid = await User.verifyPassword(currentPassword, user.password_hash);
      
      if (!isCurrentPasswordValid) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }

      const updated = await User.changePassword(req.session.userId, newPassword);
      
      if (updated) {
        res.json({ message: 'Password changed successfully' });
      } else {
        res.status(400).json({ error: 'Failed to change password' });
      }
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
  
// Fixed deleteAccount function
  async deleteAccount(req, res) {
    try {
        // Get user ID from session (based on your session structure)
        const userId = req.session.userId;
        
        if (!userId) {
            return res.status(401).json({ 
                success: false, 
                message: 'User not authenticated' 
            });
        }
        
        const Post = require('../models/post');
        
        // First, get all user's posts to delete them individually
        const userPosts = await Post.findByUserId(userId);
        
        // Delete each post (this will also delete associated images due to foreign key constraints)
        for (const post of userPosts) {
            await Post.deleteById(post.id);
        }
        
        // If you have an Alert model, uncomment and add this:
        /*
        const Alert = require('../models/alert');
        // You'll need to add a method to delete alerts by user ID or get alerts first
        // const userAlerts = await Alert.findByUserId(userId);
        // for (const alert of userAlerts) {
        //     await Alert.deleteById(alert.id);
        // }
        */
        
        // Delete the user account
        const deletedUser = await User.deleteById(userId);
        
        if (!deletedUser) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }
        
        // Clear the session
        req.session.destroy((err) => {
            if (err) {
                console.error('Session destruction error:', err);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Account deleted but session cleanup failed' 
                });
            }
            
            // Clear the session cookie
            res.clearCookie('connect.sid');
            
            res.status(200).json({ 
                success: true, 
                message: 'Account deleted successfully' 
            });
        });
        
    } catch (error) {
        console.error('Delete account error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'An error occurred while deleting your account' 
        });
    }
  }
};

module.exports = authController;