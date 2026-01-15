// apps/server/migrations/002_add_comments_and_activity.js

exports.up = function(knex) {
  return knex.schema
    // Create ticket_comments table
    .createTable('ticket_comments', function(table) {
      table.increments('id').primary();
      table.integer('ticket_id').unsigned().notNullable();
      table.integer('user_id').unsigned().notNullable();
      table.text('body').notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      
      // Foreign key constraints
      table.foreign('ticket_id')
        .references('id')
        .inTable('tickets')
        .onDelete('CASCADE');
      table.foreign('user_id')
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');
      
      // Indexes
      table.index(['ticket_id', 'created_at']);
      table.index(['user_id', 'created_at']);
    })
    
    // Create ticket_activity table
    .createTable('ticket_activity', function(table) {
      table.increments('id').primary();
      table.integer('ticket_id').unsigned().notNullable();
      table.integer('actor_user_id').unsigned().notNullable();
      table.string('type').notNullable(); // 'status_change', 'hotel_assignment', 'creation', 'comment_added'
      table.jsonb('metadata'); // Flexible metadata for different activity types
      table.timestamp('created_at').defaultTo(knex.fn.now());
      
      // Foreign key constraints
      table.foreign('ticket_id')
        .references('id')
        .inTable('tickets')
        .onDelete('CASCADE');
      table.foreign('actor_user_id')
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');
      
      // Indexes
      table.index(['ticket_id', 'created_at']);
      table.index(['actor_user_id', 'created_at']);
      table.index(['type', 'created_at']);
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('ticket_comments')
    .dropTableIfExists('ticket_activity');
};