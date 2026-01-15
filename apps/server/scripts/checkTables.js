// apps/server/scripts/checkTables.js
import knex from 'knex';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Configure knex directly
const db = knex({
  client: 'pg',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'ticketdb',
  },
  migrations: {
    directory: './migrations',
    tableName: 'knex_migrations'
  }
});

async function checkTables() {
  try {
    console.log('Checking database tables...');
    const tables = await knex.raw(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = current_schema() 
      AND table_name IN ('tickets', 'users', 'hotels', 'ticket_comments', 'ticket_activity')
      ORDER BY table_name
    `);
    
    console.log('Available tables:', tables.rows);
    return tables.rows;
  } catch (error) {
    console.error('Error checking tables:', error.message);
    process.exit(1);
  }
}

checkTables().then(tables => {
  const expectedTables = ['tickets', 'users', 'hotels'];
  const hasRequiredTables = expectedTables.every(table => 
    tables.rows.some(row => row.table_name === table)
  );
  
  if (hasRequiredTables) {
    console.log('✅ All required tables exist');
    const hasNewTables = ['ticket_comments', 'ticket_activity'].every(table => 
      tables.rows.some(row => row.table_name === table)
    );
    
    if (hasNewTables) {
      console.log('✅ New comment and activity tables exist');
    } else {
      console.log('❌ New tables not found');
    }
  } else {
    console.log('❌ Some required tables missing');
  }
  
  process.exit(0);
});