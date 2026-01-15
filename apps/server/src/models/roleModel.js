import { pool } from '../config/db.js';

export class RoleModel {
  static async getAllRoles() {
    const result = await pool.query(`
      SELECT r.*, 
             COUNT(DISTINCT ura.user_id) as user_count
      FROM roles r
      LEFT JOIN user_role_assignments ura ON r.id = ura.role_id
      GROUP BY r.id
      ORDER BY r.is_system DESC, r.display_name
    `);
    
    return result.rows;
  }

  static async findById(id) {
    const result = await pool.query(`
      SELECT r.*, 
             COUNT(DISTINCT ura.user_id) as user_count
      FROM roles r
      LEFT JOIN user_role_assignments ura ON r.id = ura.role_id
      WHERE r.id = $1
      GROUP BY r.id
    `, [id]);
    
    return result.rows[0];
  }

  static async findByName(name) {
    const result = await pool.query(`
      SELECT r.*, 
             COUNT(DISTINCT ura.user_id) as user_count
      FROM roles r
      LEFT JOIN user_role_assignments ura ON r.id = ura.role_id
      WHERE r.name = $1
      GROUP BY r.id
    `, [name]);
    
    return result.rows[0];
  }

  static async create(roleData) {
    const { name, display_name, description, permissions } = roleData;
    const result = await pool.query(`
      INSERT INTO roles (name, display_name, description, permissions)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [name, display_name, description, JSON.stringify(permissions)]);
    
    return result.rows[0];
  }

  static async update(id, roleData) {
    const { display_name, description, permissions } = roleData;
    const result = await pool.query(`
      UPDATE roles 
      SET display_name = $2, 
          description = $3, 
          permissions = $4,
          updated_at = NOW()
      WHERE id = $1 AND is_system = false
      RETURNING *
    `, [id, display_name, description, JSON.stringify(permissions)]);
    
    return result.rows[0];
  }

  static async delete(id) {
    const result = await pool.query(`
      DELETE FROM roles 
      WHERE id = $1 AND is_system = false
      RETURNING *
    `, [id]);
    
    return result.rows[0];
  }

  static async getRoleUsers(roleId, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    
    const result = await pool.query(`
      SELECT u.*, ura.assigned_at, ura.expires_at,
             assigner.name as assigned_by_name
      FROM user_role_assignments ura
      JOIN users u ON ura.user_id = u.id
      LEFT JOIN users assigner ON ura.assigned_by = assigner.id
      WHERE ura.role_id = $1
      ORDER BY ura.assigned_at DESC
      LIMIT $2 OFFSET $3
    `, [roleId, limit, offset]);

    const countResult = await pool.query(`
      SELECT COUNT(*) as total FROM user_role_assignments WHERE role_id = $1
    `, [roleId]);

    return {
      users: result.rows,
      total: parseInt(countResult.rows[0].total),
      page,
      limit,
      totalPages: Math.ceil(countResult.rows[0].total / limit)
    };
  }

  static async getAvailablePermissions() {
    return {
      users: ['create', 'read', 'update', 'delete'],
      roles: ['create', 'read', 'update', 'delete'],
      hotels: ['create', 'read', 'update', 'delete'],
      tickets: ['create', 'read', 'update', 'delete'],
      audit_logs: ['read'],
      system: ['manage']
    };
  }
}