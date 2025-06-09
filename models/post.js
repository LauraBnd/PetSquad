const { pool } = require('../config/db');

class Post {
  static async create(postData, images) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      const [result] = await connection.execute(
        'INSERT INTO posts (user_id, tag, pet_name, location, date, breed, size, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [postData.userId, postData.tag, postData.petName, postData.location, postData.date, postData.breed, postData.size, postData.description]
      );
      
      const postId = result.insertId;
      
      if (images && images.length > 0) {
        for (const imagePath of images) {
          await connection.execute(
            'INSERT INTO images (post_id, image_path) VALUES (?, ?)',
            [postId, imagePath]
          );
        }
      }
      
      await connection.commit();
      return postId;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async findAll(filters = {}) {
    try {
      let query = `
        SELECT p.*, u.username, 
        GROUP_CONCAT(i.image_path) as images
        FROM posts p 
        JOIN users u ON p.user_id = u.id 
        LEFT JOIN images i ON p.id = i.post_id 
        WHERE p.is_solved = FALSE
      `;
      let params = [];

      if (filters.tag) {
        query += ' AND p.tag = ?';
        params.push(filters.tag);
      }
      if (filters.size) {
        query += ' AND p.size = ?';
        params.push(filters.size);
      }
      if (filters.breed) {
        query += ' AND p.breed LIKE ?';
        params.push(`%${filters.breed}%`);
      }
      if (filters.keywords) {
        query += ' AND (p.description LIKE ? OR p.location LIKE ? OR p.pet_name LIKE ?)';
        params.push(`%${filters.keywords}%`, `%${filters.keywords}%`, `%${filters.keywords}%`);
      }
      if (filters.startingFrom) {
        query += ' AND p.date >= ?';
        params.push(filters.startingFrom);
      }

      query += ' GROUP BY p.id ORDER BY p.created_at DESC';

      const [rows] = await pool.execute(query, params);
      return rows.map(row => ({
        ...row,
        images: row.images ? row.images.split(',') : []
      }));
    } catch (error) {
      throw error;
    }
  }

  static async findById(id) {
    try {
      const [posts] = await pool.execute(`
        SELECT p.*, u.username, u.email, u.phone_number
        FROM posts p 
        JOIN users u ON p.user_id = u.id 
        WHERE p.id = ?
      `, [id]);
      
      if (posts.length === 0) return null;
      
      const [images] = await pool.execute(
        'SELECT image_path FROM images WHERE post_id = ?',
        [id]
      );
      
      return {
        ...posts[0],
        images: images.map(img => img.image_path)
      };
    } catch (error) {
      throw error;
    }
  }

  static async findByUserId(userId) {
    try {
      const [rows] = await pool.execute(`
        SELECT p.*, GROUP_CONCAT(i.image_path) as images
        FROM posts p 
        LEFT JOIN images i ON p.id = i.post_id 
        WHERE p.user_id = ?
        GROUP BY p.id 
        ORDER BY p.created_at DESC
      `, [userId]);
      
      return rows.map(row => ({
        ...row,
        images: row.images ? row.images.split(',') : []
      }));
    } catch (error) {
      throw error;
    }
  }

  // NEW: Update post method
  static async updateById(id, postData, newImages = []) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    // Update post data
    const [result] = await connection.execute(`
      UPDATE posts 
      SET tag = ?, pet_name = ?, location = ?, date = ?, breed = ?, size = ?, description = ?
      WHERE id = ?
    `, [postData.tag, postData.petName, postData.location, postData.date, postData.breed, postData.size, postData.description, id]);
    
    // Add new images if any
    if (newImages && newImages.length > 0) {
      for (const imagePath of newImages) {
        await connection.execute(
          'INSERT INTO images (post_id, image_path) VALUES (?, ?)',
          [id, imagePath]
        );
      }
    }
    
    await connection.commit();
    return result.affectedRows > 0;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// Delete specific image from post
static async deleteImage(postId, imagePath) {
  try {
    const [result] = await pool.execute(
      'DELETE FROM images WHERE post_id = ? AND image_path = ?',
      [postId, imagePath]
    );
    return result.affectedRows > 0;
  } catch (error) {
    throw error;
  }
}

  // NEW: Delete specific image from post
  static async deleteImage(postId, imagePath) {
    try {
      const [result] = await pool.execute(
        'DELETE FROM images WHERE post_id = ? AND image_path = ?',
        [postId, imagePath]
      );
      return result.affectedRows > 0;
    } catch (error) {
      throw error;
    }
  }

  static async markAsSolved(id) {
    try {
      const [result] = await pool.execute(
        'UPDATE posts SET is_solved = TRUE WHERE id = ?',
        [id]
      );
      return result.affectedRows > 0;
    } catch (error) {
      throw error;
    }
  }

  static async deleteById(id) {
    try {
      const [result] = await pool.execute('DELETE FROM posts WHERE id = ?', [id]);
      return result.affectedRows > 0;
    } catch (error) {
      throw error;
    }
  }

  static async getSolvedCount() {
    try {
      const [rows] = await pool.execute('SELECT COUNT(*) as count FROM posts WHERE is_solved = TRUE');
      return rows[0].count;
    } catch (error) {
      throw error;
    }
  }

  static async getAll() {
    try {
      const [rows] = await pool.execute(`
        SELECT p.*, u.username, GROUP_CONCAT(i.image_path) as images
        FROM posts p 
        JOIN users u ON p.user_id = u.id 
        LEFT JOIN images i ON p.id = i.post_id 
        GROUP BY p.id 
        ORDER BY p.created_at DESC
      `);
      
      return rows.map(row => ({
        ...row,
        images: row.images ? row.images.split(',') : []
      }));
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Post;