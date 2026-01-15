import { pool } from '../config/db.js';

export class UserModel {
  static async findById(id) {
    const result = await pool.query(`
      SELECT u.*, 
             COALESCE(
               json_agg(
                 json_build_object(
                   'id', r.id,
                   'name', r.name,
                   'display_name', r.display_name,
                   'permissions', r.permissions
                 )
               ) FILTER (WHERE r.id IS NOT NULL), 
               '[]'::json
             ) as roles
      FROM users u
      LEFT JOIN user_role_assignments ura ON u.id = ura.user_id
      LEFT JOIN roles r ON ura.role_id = r.id
      WHERE u.id = $1
      GROUP BY u.id
    `, [id]);
    
    return result.rows[0];
  }

  static async findByGoogleId(googleId) {
    const result = await pool.query(`
      SELECT u.*, 
             COALESCE(
               json_agg(
                 json_build_object(
                   'id', r.id,
                   'name', r.name,
                   'display_name', r.display_name,
                   'permissions', r.permissions
                 )
               ) FILTER (WHERE r.id IS NOT NULL), 
               '[]'::json
             ) as roles
      FROM users u
      LEFT JOIN user_role_assignments ura ON u.id = ura.user_id
      LEFT JOIN roles r ON ura.role_id = r.id
      WHERE u.google_id = $1
      GROUP BY u.id
    `, [googleId]);
    
    return result.rows[0];
  }

  static async findByEmail(email) {
    const result = await pool.query(`
      SELECT u.*, 
             COALESCE(
               json_agg(
                 json_build_object(
                   'id', r.id,
                   'name', r.name,
                   'display_name', r.display_name,
                   'permissions', r.permissions
                 )
               ) FILTER (WHERE r.id IS NOT NULL), 
               '[]'::json
             ) as roles
      FROM users u
      LEFT JOIN user_role_assignments ura ON u.id = ura.user_id
      LEFT JOIN roles r ON ura.role_id = r.id
      WHERE u.email = $1
      GROUP BY u.id
    `, [email]);
    
    return result.rows[0];
  }

  static async create(userData) {
    const { google_id, email, name } = userData;
    const result = await pool.query(`
      INSERT INTO users (google_id, email, name)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [google_id, email, name]);
    
    // Assign default user role
    const user = result.rows[0];
    await pool.query(`
      INSERT INTO user_role_assignments (user_id, role_id)
      SELECT $1, id FROM roles WHERE name = 'user'
    `, [user.id]);
    
    return this.findById(user.id);
  }

  static async updateLastLogin(userId) {
    await pool.query(`
      UPDATE users 
      SET last_login = NOW() 
      WHERE id = $1
    `, [userId]);
  }

  static async updateUserRole(userId, roleIds, assignedBy) {
    await pool.query('BEGIN');
    
    try {
      // Remove existing role assignments
      await pool.query(`
        DELETE FROM user_role_assignments WHERE user_id = $1
      `, [userId]);
      
      // Add new role assignments
      for (const roleId of roleIds) {
        await pool.query(`
          INSERT INTO user_role_assignments (user_id, role_id, assigned_by)
          VALUES ($1, $2, $3)
        `, [userId, roleId, assignedBy]);
      }
      
      await pool.query('COMMIT');
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }
    
    return this.findById(userId);
  }

  static async getAllUsers(page = 1, limit = 20, filters = {}) {
    const offset = (page - 1) * limit;
    let whereClause = 'WHERE u.is_active = true';
    let queryParams = [limit, offset];
    let paramIndex = 3;

    if (filters.search) {
      whereClause += ` AND (u.name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`;
      queryParams.push(`%${filters.search}%`);
      paramIndex++;
    }

    if (filters.role) {
      whereClause += ` AND EXISTS (
        SELECT 1 FROM user_role_assignments ura 
        JOIN roles r ON ura.role_id = r.id 
        WHERE ura.user_id = u.id AND r.name = $${paramIndex}
      )`;
      queryParams.push(filters.role);
      paramIndex++;
    }

    const result = await pool.query(`
      SELECT u.id, u.name, u.email, u.created_at, u.last_login, u.is_active,
             COALESCE(
               json_agg(
                 json_build_object(
                   'id', r.id,
                   'name', r.name,
                   'display_name', r.display_name
                 )
               ) FILTER (WHERE r.id IS NOT NULL), 
               '[]'::json
             ) as roles
      FROM users u
      LEFT JOIN user_role_assignments ura ON u.id = ura.user_id
      LEFT JOIN roles r ON ura.role_id = r.id
      ${whereClause}
      GROUP BY u.id, u.name, u.email, u.created_at, u.last_login, u.is_active
      ORDER BY u.created_at DESC
      LIMIT $1 OFFSET $2
    `, queryParams);

    const countResult = await pool.query(`
      SELECT COUNT(DISTINCT u.id) as total
      FROM users u
      LEFT JOIN user_role_assignments ura ON u.id = ura.user_id
      LEFT JOIN roles r ON ura.role_id = r.id
      ${whereClause}
    `, queryParams.slice(0, -2));

    return {
      users: result.rows,
      total: parseInt(countResult.rows[0].total),
      page,
      limit,
      totalPages: Math.ceil(countResult.rows[0].total / limit)
    };
  }

  static async updateUserStatus(userId, isActive, updatedBy) {
    const result = await pool.query(`
      UPDATE users 
      SET is_active = $2, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [userId, isActive]);

    return result.rows[0];
  }

  static async hasPermission(userId, permission) {
    const [resource, action] = permission.split(':');
    
    const result = await pool.query(`
      SELECT 1 FROM user_role_assignments ura
      JOIN roles r ON ura.role_id = r.id
      WHERE ura.user_id = $1 
      AND r.permissions->>$2 IS NOT NULL
      AND r.permissions->$2 @> $3::json
    `, [userId, resource, JSON.stringify([action])]);

    return result.rows.length > 0;
  }

  static async getUserPermissions(userId) {
    const result = await pool.query(`
      SELECT DISTINCT 
        key,
        json_agg(DISTINCT elem) as actions
      FROM user_role_assignments ura
      JOIN roles r ON ura.role_id = r.id
      CROSS JOIN jsonb_each_text(r.permissions) as t(key, value)
      CROSS JOIN jsonb_array_elements_text(r.permissions->key) as elem
      WHERE ura.user_id = $1
      GROUP BY key
    `, [userId]);

    const permissions = {};
    result.rows.forEach(row => {
      permissions[row.key] = row.actions;
    });

    return permissions;
  }
}