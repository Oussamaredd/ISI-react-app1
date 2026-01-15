import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Database schema manager
 * Ensures database schema matches the single source of truth in schema.sql
 */
export class SchemaManager {
  constructor() {
    this.schemaPath = path.join(__dirname, 'schema.sql');
  }

  /**
   * Read and execute the schema SQL file
   */
  async initializeSchema() {
    try {
      const schemaSQL = fs.readFileSync(this.schemaPath, 'utf8');
      
      // Split SQL into individual statements
      const statements = schemaSQL
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

      // Execute each statement
      for (const statement of statements) {
        await pool.query(statement);
      }

      console.log('✅ Database schema initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Error initializing database schema:', error);
      throw error;
    }
  }

  /**
   * Verify schema integrity
   */
  async verifySchema() {
    try {
      // Check if all required tables exist
      const tablesQuery = `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('tickets', 'hotels', 'users')
      `;
      
      const result = await pool.query(tablesQuery);
      const existingTables = result.rows.map(row => row.table_name);
      
      const requiredTables = ['tickets', 'hotels', 'users'];
      const missingTables = requiredTables.filter(table => !existingTables.includes(table));
      
      if (missingTables.length > 0) {
        console.error(`❌ Missing tables: ${missingTables.join(', ')}`);
        return false;
      }

      // Check foreign key constraints
      const constraintsQuery = `
        SELECT conname, contype 
        FROM pg_constraint 
        WHERE conrelid = 'tickets'::regclass 
        AND conname = 'tickets_hotel_id_fkey'
      `;
      
      const constraintsResult = await pool.query(constraintsQuery);
      
      if (constraintsResult.rows.length === 0) {
        console.error('❌ Missing foreign key constraint: tickets_hotel_id_fkey');
        return false;
      }

      // Check check constraints
      const checkConstraintsQuery = `
        SELECT conname, contype 
        FROM pg_constraint 
        WHERE conrelid = 'tickets'::regclass 
        AND conname = 'tickets_status_check'
      `;
      
      const checkConstraintsResult = await pool.query(checkConstraintsQuery);
      
      if (checkConstraintsResult.rows.length === 0) {
        console.error('❌ Missing check constraint: tickets_status_check');
        return false;
      }

      console.log('✅ Database schema verification passed');
      return true;
    } catch (error) {
      console.error('❌ Error verifying database schema:', error);
      return false;
    }
  }

  /**
   * Get schema status information
   */
  async getSchemaStatus() {
    try {
      const status = {
        tables: {},
        constraints: {},
        indexes: {},
        sampleData: {
          hotels: 0,
          tickets: 0,
          users: 0
        }
      };

      // Get table information
      const tableInfoQuery = `
        SELECT table_name, 
               (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
        FROM information_schema.tables t
        WHERE table_schema = 'public' 
        AND table_name IN ('tickets', 'hotels', 'users')
      `;
      
      const tableResult = await pool.query(tableInfoQuery);
      tableResult.rows.forEach(row => {
        status.tables[row.table_name] = {
          columns: row.column_count
        };
      });

      // Get constraint information
      const constraintQuery = `
        SELECT conname, contype, conrelid::regclass as table_name
        FROM pg_constraint 
        WHERE conrelid IN ('tickets'::regclass, 'hotels'::regclass, 'users'::regclass)
      `;
      
      const constraintResult = await pool.query(constraintQuery);
      constraintResult.rows.forEach(row => {
        status.constraints[row.conname] = {
          type: row.contype,
          table: row.table_name
        };
      });

      // Get sample data counts
      const dataCountsQuery = `
        SELECT 
          (SELECT COUNT(*) FROM hotels) as hotels,
          (SELECT COUNT(*) FROM tickets) as tickets,
          (SELECT COUNT(*) FROM users) as users
      `;
      
      const dataResult = await pool.query(dataCountsQuery);
      status.sampleData = dataResult.rows[0];

      return status;
    } catch (error) {
      console.error('❌ Error getting schema status:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const schemaManager = new SchemaManager();