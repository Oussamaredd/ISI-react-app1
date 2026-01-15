import { pool } from '../config/db.js';

export class AuditLogModel {
  static async create(logData) {
    const { user_id, action, resource_type, resource_id, old_values, new_values, ip_address, user_agent } = logData;
    
    const result = await pool.query(`
      INSERT INTO audit_logs (user_id, action, resource_type, resource_id, old_values, new_values, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      user_id,
      action,
      resource_type,
      resource_id,
      old_values ? JSON.stringify(old_values) : null,
      new_values ? JSON.stringify(new_values) : null,
      ip_address,
      user_agent
    ]);
    
    return result.rows[0];
  }

  static async findByUser(userId, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    
    const result = await pool.query(`
      SELECT al.*, u.name as user_name
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE al.user_id = $1
      ORDER BY al.created_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, limit, offset]);

    const countResult = await pool.query(`
      SELECT COUNT(*) as total FROM audit_logs WHERE user_id = $1
    `, [userId]);

    return {
      logs: result.rows,
      total: parseInt(countResult.rows[0].total),
      page,
      limit,
      totalPages: Math.ceil(countResult.rows[0].total / limit)
    };
  }

  static async findByResource(resourceType, resourceId, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    
    const result = await pool.query(`
      SELECT al.*, u.name as user_name
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE al.resource_type = $1 AND al.resource_id = $2
      ORDER BY al.created_at DESC
      LIMIT $3 OFFSET $4
    `, [resourceType, resourceId, limit, offset]);

    const countResult = await pool.query(`
      SELECT COUNT(*) as total 
      FROM audit_logs 
      WHERE resource_type = $1 AND resource_id = $2
    `, [resourceType, resourceId]);

    return {
      logs: result.rows,
      total: parseInt(countResult.rows[0].total),
      page,
      limit,
      totalPages: Math.ceil(countResult.rows[0].total / limit)
    };
  }

  static async getAll(filters = {}, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    let whereClause = 'WHERE 1=1';
    let queryParams = [limit, offset];
    let paramIndex = 3;

    if (filters.user_id) {
      whereClause += ` AND al.user_id = $${paramIndex}`;
      queryParams.push(filters.user_id);
      paramIndex++;
    }

    if (filters.action) {
      whereClause += ` AND al.action = $${paramIndex}`;
      queryParams.push(filters.action);
      paramIndex++;
    }

    if (filters.resource_type) {
      whereClause += ` AND al.resource_type = $${paramIndex}`;
      queryParams.push(filters.resource_type);
      paramIndex++;
    }

    if (filters.date_from) {
      whereClause += ` AND al.created_at >= $${paramIndex}`;
      queryParams.push(filters.date_from);
      paramIndex++;
    }

    if (filters.date_to) {
      whereClause += ` AND al.created_at <= $${paramIndex}`;
      queryParams.push(filters.date_to);
      paramIndex++;
    }

    const result = await pool.query(`
      SELECT al.*, u.name as user_name
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ${whereClause}
      ORDER BY al.created_at DESC
      LIMIT $1 OFFSET $2
    `, queryParams);

    const countResult = await pool.query(`
      SELECT COUNT(*) as total
      FROM audit_logs al
      ${whereClause}
    `, queryParams.slice(0, -2));

    return {
      logs: result.rows,
      total: parseInt(countResult.rows[0].total),
      page,
      limit,
      totalPages: Math.ceil(countResult.rows[0].total / limit)
    };
  }

  static async getAuditStats() {
    const result = await pool.query(`
      SELECT 
        action,
        resource_type,
        COUNT(*) as count,
        DATE(created_at) as date
      FROM audit_logs 
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY action, resource_type, DATE(created_at)
      ORDER BY date DESC, count DESC
    `);

    return result.rows;
  }
}