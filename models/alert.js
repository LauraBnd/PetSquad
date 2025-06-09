const { pool } = require('../config/db');

class Alert {
  static async create(alertData) {
    try {
      const [result] = await pool.execute(
        'INSERT INTO alerts (sender_id, receiver_id, post_id, message) VALUES (?, ?, ?, ?)',
        [alertData.senderId, alertData.receiverId, alertData.postId, alertData.message]
      );
      return result.insertId;
    } catch (error) {
      throw error;
    }
  }

  static async findByReceiverId(receiverId) {
    try {
      const [rows] = await pool.execute(`
        SELECT a.*, 
               u1.username as sender_username,
               u2.username as receiver_username,
               p.tag, p.pet_name, p.location,
               GROUP_CONCAT(i.image_path) as images
        FROM alerts a
        JOIN users u1 ON a.sender_id = u1.id
        JOIN users u2 ON a.receiver_id = u2.id
        JOIN posts p ON a.post_id = p.id
        LEFT JOIN images i ON p.id = i.post_id
        WHERE a.receiver_id = ?
        GROUP BY a.id
        ORDER BY a.created_at DESC
      `, [receiverId]);
      
      return rows.map(row => ({
        ...row,
        images: row.images ? row.images.split(',') : []
      }));
    } catch (error) {
      throw error;
    }
  }

  static async markAsRead(alertId) {
    try {
      const [result] = await pool.execute(
        'UPDATE alerts SET is_read = TRUE WHERE id = ?',
        [alertId]
      );
      return result.affectedRows > 0;
    } catch (error) {
      throw error;
    }
  }

  static async checkPendingAlert(receiverId) {
    try {
      const [rows] = await pool.execute(`
        SELECT a.*, p.tag, p.pet_name, p.location,
               u.username as sender_username,
               GROUP_CONCAT(i.image_path) as images
        FROM alerts a
        JOIN posts p ON a.post_id = p.id
        JOIN users u ON a.sender_id = u.id
        LEFT JOIN images i ON p.id = i.post_id
        WHERE a.receiver_id = ? AND a.is_read = FALSE
        GROUP BY a.id
        ORDER BY a.created_at DESC
        LIMIT 1
      `, [receiverId]);
      
      if (rows.length > 0) {
        return {
          ...rows[0],
          images: rows[0].images ? rows[0].images.split(',') : []
        };
      }
      return null;
    } catch (error) {
      throw error;
    }
  }

  static async deleteById(id) {
    try {
      const [result] = await pool.execute('DELETE FROM alerts WHERE id = ?', [id]);
      return result.affectedRows > 0;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Alert;