import db from '../config/knexfile.js';

/**
 * Run database migrations
 */
export async function runMigrations() {
  try {
    console.log('🔄 Running database migrations...');
    await db.migrate.latest();
    console.log('✅ Migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

/**
 * Seed database with sample data
 */
export async function runSeeds() {
  try {
    console.log('🌱 Seeding database with sample data...');
    await db.seed.run();
    console.log('✅ Database seeded successfully');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  }
}

/**
 * Check database connection and run migrations/seeds if needed
 */
export async function initializeDatabase() {
  try {
    // Test database connection
    await db.raw('SELECT 1');
    console.log('✅ Database connection established');
    
    // Run migrations
    await runMigrations();
    
    // Run seeds (only in development or if explicitly requested)
    if (process.env.NODE_ENV !== 'production' || process.env.RUN_SEEDS === 'true') {
      await runSeeds();
    }
    
    return true;
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

export default db;