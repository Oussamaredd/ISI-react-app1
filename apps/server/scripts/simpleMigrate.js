// apps/server/scripts/simpleMigrate.js
import { pool } from '../src/config/db.js';

async function runMigrations() {
  try {
    console.log('Running simple migrations...');
    
    // Check if migrations table exists
    const migrationsTableResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'knex_migrations'
      )
    `);
    
    const hasMigrationsTable = migrationsTableResult.rows[0].exists;
    
    if (!hasMigrationsTable) {
      console.log('Creating knex_migrations table...');
      await pool.query(`
        CREATE TABLE knex_migrations (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL UNIQUE,
          batch VARCHAR(255),
          migration_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ knex_migrations table created');
    }

    // Read migration files
    const fs = await import('fs/promises');
    const migrationFiles = await fs.readdir('./migrations');
    
    console.log('Found migration files:', migrationFiles);
    
    for (const file of migrationFiles) {
      if (file.endsWith('.js')) {
        console.log(`Running migration: ${file}`);
        
        const migrationPath = `./migrations/${file}`;
        const { up } = await import(migrationPath);
        
        if (typeof up === 'function') {
          await up(pool);
          console.log(`✅ Migration ${file} completed`);
        } else {
          console.log(`⚠️ Migration ${file} doesn't export an 'up' function`);
        }
      }
    }
    
    console.log('✅ All migrations completed');
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();