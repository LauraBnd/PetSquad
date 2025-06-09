const { pool } = require('../config/db');
const bcrypt = require('bcrypt');

class User {
  static async findByEmail(email) {
    try {
      const [rows] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
      return rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  static async findByUsername(username) {
    try {
      const [rows] = await pool.execute('SELECT * FROM users WHERE username = ?', [username]);
      return rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  static async findById(id) {
    try {
      const [rows] = await pool.execute('SELECT * FROM users WHERE id = ?', [id]);
      return rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  static async create(userData) {
    try {
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const [result] = await pool.execute(
        'INSERT INTO users (username, email, password_hash, full_name, phone_number) VALUES (?, ?, ?, ?, ?)',
        [userData.username, userData.email, hashedPassword, userData.fullName, userData.phoneNumber]
      );
      return result.insertId;
    } catch (error) {
      throw error;
    }
  }

  static async verifyPassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }

  static async updateProfile(userId, userData) {
    try {
      let query = 'UPDATE users SET ';
      let params = [];
      let updates = [];

      if (userData.fullName) {
        updates.push('full_name = ?');
        params.push(userData.fullName);
      }
      if (userData.username) {
        updates.push('username = ?');
        params.push(userData.username);
      }
      if (userData.email) {
        updates.push('email = ?');
        params.push(userData.email);
      }
      if (userData.phoneNumber) {
        updates.push('phone_number = ?');
        params.push(userData.phoneNumber);
      }

      query += updates.join(', ') + ' WHERE id = ?';
      params.push(userId);

      const [result] = await pool.execute(query, params);
      return result.affectedRows > 0;
    } catch (error) {
      throw error;
    }
  }

  static async changePassword(userId, newPassword) {
    try {
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      const [result] = await pool.execute(
        'UPDATE users SET password_hash = ? WHERE id = ?',
        [hashedPassword, userId]
      );
      return result.affectedRows > 0;
    } catch (error) {
      throw error;
    }
  }

  static async getAll() {
    try {
      const [rows] = await pool.execute('SELECT id, username, email, full_name, phone_number, created_at FROM users');
      return rows;
    } catch (error) {
      throw error;
    }
  }

  static async deleteById(id) {
    try {
      const [result] = await pool.execute('DELETE FROM users WHERE id = ?', [id]);
      return result.affectedRows > 0;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = User;