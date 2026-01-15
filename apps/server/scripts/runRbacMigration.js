// Run enhanced RBAC migration
import { pool } from '../src/config/db.js';
import { up } from '../migrations/003_enhanced_rbac.js';

async function runMigration() {
  try {
    console.log('Running enhanced RBAC migration...');
    await up({ raw: (query) => pool.query(query) });
    console.log('Enhanced RBAC migration completed successfully!');
  } catch (error) {
    console.error('Error running RBAC migration:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();