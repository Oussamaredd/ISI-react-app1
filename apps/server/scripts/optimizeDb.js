import { pool } from '../src/config/db.js';

export class DatabaseOptimizer {
  constructor() {
    this.analysisResults = {
      tables: [],
      indexes: [],
      queries: [],
      recommendations: []
    };
  }

  async analyzeDatabase() {
    console.log('🔍 Analyzing database performance...');
    
    // Analyze table sizes and row counts
    await this.analyzeTables();
    
    // Analyze existing indexes
    await this.analyzeIndexes();
    
    // Analyze slow queries
    await this.analyzeSlowQueries();
    
    // Generate recommendations
    await this.generateRecommendations();
    
    this.printReport();
  }

  async analyzeTables() {
    const query = `
      SELECT 
        schemaname,
        tablename,
        n_tup_ins as inserts,
        n_tup_upd as updates,
        n_tup_del as deletes,
        n_live_tup as live_rows,
        pg_size_pretty as table_size,
        pg_indexes_size_pretty as indexes_size,
        (
          SELECT pg_size_pretty 
          FROM pg_stat_user_tables 
          WHERE schemaname = s.schemaname AND tablename = s.tablename
        ) AS full_size
      FROM pg_stat_user_tables s
      WHERE schemaname = 'public'
      ORDER BY pg_total_relation_size DESC
    `;
    
    try {
      const result = await pool.query(query);
      this.analysisResults.tables = result.rows;
      
      console.log('\n📊 Table Analysis:');
      result.rows.forEach(table => {
        console.log(`${table.tablename}: ${table.live_rows} rows, ${table.table_size} (indexes: ${table.indexes_size})`);
        
        // Flag large tables
        if (parseInt(table.full_size.replace(/\D/g, '')) > 100) { // > 100MB
          this.analysisResults.recommendations.push({
            type: 'table_optimization',
            table: table.tablename,
            issue: 'Large table detected',
            recommendation: 'Consider partitioning or archiving old data'
          });
        }
      });
    } catch (error) {
      console.error('Error analyzing tables:', error);
    }
  }

  async analyzeIndexes() {
    const query = `
      SELECT 
        schemaname,
        tablename,
        indexname,
        indexdef,
        idx_scan as index_scans,
        idx_tup_read as index_reads,
        idx_tup_fetch as index_fetches,
        pg_size_pretty as index_size
      FROM pg_stat_user_indexes si
      JOIN pg_class pc ON si.indexrelid = pc.oid
      JOIN pg_namespace pn ON si.schemaname = pn.nspname
      WHERE schemaname = 'public'
      ORDER BY idx_scan DESC, idx_tup_read DESC
    `;
    
    try {
      const result = await pool.query(query);
      this.analysisResults.indexes = result.rows;
      
      console.log('\n📋 Index Analysis:');
      result.rows.forEach(index => {
        console.log(`${index.indexname} on ${index.tablename}: ${index.index_scans} scans, ${index.index_size}`);
        
        // Flag unused indexes
        if (index.index_scans === 0) {
          this.analysisResults.recommendations.push({
            type: 'index_optimization',
            index: index.indexname,
            table: index.tablename,
            issue: 'Unused index',
            recommendation: 'Consider removing unused index to improve write performance'
          });
        }
        
        // Flag large indexes
        if (parseInt(index.index_size.replace(/\D/g, '')) > 50) { // > 50MB
          this.analysisResults.recommendations.push({
            type: 'index_optimization',
            index: index.indexname,
            table: index.tablename,
            issue: 'Large index',
            recommendation: 'Consider optimizing index definition or partial indexes'
          });
        }
      });
    } catch (error) {
      console.error('Error analyzing indexes:', error);
    }
  }

  async analyzeSlowQueries() {
    // Check pg_stat_statements if available
    try {
      const query = `
        SELECT 
          query,
          calls,
          total_exec_time,
          mean_exec_time,
          max_exec_time,
          stddev_exec_time,
          rows,
          100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
        FROM pg_stat_statements 
        WHERE calls > 10 
        ORDER BY mean_exec_time DESC 
        LIMIT 10
      `;
      
      const result = await pool.query(query);
      this.analysisResults.queries = result.rows;
      
      console.log('\n⚡ Slow Query Analysis:');
      result.rows.forEach((query, index) => {
        console.log(`\n${index + 1}. Mean time: ${query.mean_exec_time.toFixed(2)}ms`);
        console.log(`   Calls: ${query.calls}`);
        console.log(`   Hit rate: ${query.hit_percent?.toFixed(2)}%`);
        console.log(`   Query: ${query.query.substring(0, 100)}...`);
        
        if (query.mean_exec_time > 100) {
          this.analysisResults.recommendations.push({
            type: 'query_optimization',
            query: query.query.substring(0, 100),
            issue: 'Slow query detected',
            recommendation: 'Add appropriate index or rewrite query'
          });
        }
        
        if (query.hit_percent < 95) {
          this.analysisResults.recommendations.push({
            type: 'query_optimization',
            query: query.query.substring(0, 100),
            issue: 'Low buffer hit rate',
            recommendation: 'Consider increasing shared_buffers or optimizing queries'
          });
        }
      });
    } catch (error) {
      console.log('pg_stat_statements not available or error:', error.message);
      
      // Fallback: Analyze recent queries from application logs if available
      await this.analyzeApplicationQueries();
    }
  }

  async analyzeApplicationQueries() {
    console.log('\n🔍 Analyzing application query patterns...');
    
    // Common query patterns that might need optimization
    const slowPatterns = [
      {
        pattern: /SELECT.*FROM.*tickets.*ORDER BY.*created_at.*DESC/i,
        description: 'Ticket list without date limit',
        recommendation: 'Add date range filter or pagination'
      },
      {
        pattern: /SELECT.*FROM.*tickets.*WHERE.*LIKE/i,
        description: 'Text search with LIKE',
        recommendation: 'Consider full-text search or proper indexing'
      },
      {
        pattern: /SELECT.*COUNT.*FROM.*large_table/i,
        description: 'COUNT on large table',
        recommendation: 'Use approximate counting or materialized views'
      }
    ];
    
    slowPatterns.forEach(pattern => {
      this.analysisResults.recommendations.push({
        type: 'query_pattern',
        pattern: pattern.description,
        recommendation: pattern.recommendation
      });
    });
  }

  async generateRecommendations() {
    console.log('\n💡 Generating optimization recommendations...');
    
    // Index recommendations
    await this.suggestMissingIndexes();
    
    // Table optimization recommendations
    await this.suggestTableOptimizations();
    
    // Configuration recommendations
    await this.suggestConfigurationOptimizations();
  }

  async suggestMissingIndexes() {
    const commonIndexes = [
      {
        table: 'tickets',
        columns: ['status', 'created_at', 'hotel_id'],
        reason: 'Frequent filtering and sorting'
      },
      {
        table: 'users', 
        columns: ['email', 'google_id'],
        reason: 'Authentication lookups'
      },
      {
        table: 'ticket_comments',
        columns: ['ticket_id', 'user_id', 'created_at'],
        reason: 'Comment retrieval and user activity'
      },
      {
        table: 'ticket_activity',
        columns: ['ticket_id', 'actor_user_id', 'created_at', 'type'],
        reason: 'Activity timeline filtering'
      }
    ];
    
    for (const index of commonIndexes) {
      const exists = this.analysisResults.indexes.some(
        idx => idx.tablename === index.table && 
        index.indexname.includes(index.columns.join('_'))
      );
      
      if (!exists) {
        this.analysisResults.recommendations.push({
          type: 'missing_index',
          table: index.table,
          columns: index.columns,
          reason: index.reason,
          recommendation: `CREATE INDEX idx_${index.table}_${index.columns.join('_')} ON ${index.table} (${index.columns.join(', ')})`
        });
      }
    }
  }

  async suggestTableOptimizations() {
    const largeTables = this.analysisResults.tables.filter(
      table => parseInt(table.full_size.replace(/\D/g, '')) > 100
    );
    
    largeTables.forEach(table => {
      if (table.tablename.includes('audit_logs') || table.tablename.includes('activity')) {
        this.analysisResults.recommendations.push({
          type: 'table_archiving',
          table: table.tablename,
          reason: 'Historical data accumulation',
          recommendation: `Archive old ${table.tablename} records to separate table or implement partitioning`
        });
      }
    });
  }

  async suggestConfigurationOptimizations() {
    // Check current PostgreSQL settings
    try {
      const settingsQuery = `
        SELECT name, setting, unit, short_desc
        FROM pg_settings 
        WHERE name IN (
          'shared_buffers', 
          'effective_cache_size',
          'work_mem', 
          'maintenance_work_mem',
          'random_page_cost',
          'seq_page_cost'
        )
      `;
      
      const settings = await pool.query(settingsQuery);
      
      settings.rows.forEach(setting => {
        const value = parseFloat(setting.setting);
        
        switch (setting.name) {
          case 'shared_buffers':
            if (value < 128) {
              this.analysisResults.recommendations.push({
                type: 'configuration',
                setting: 'shared_buffers',
                current: value,
                recommended: '256MB or higher',
                reason: 'More shared memory can reduce disk I/O'
              });
            }
            break;
            
          case 'work_mem':
            if (value < 4) {
              this.analysisResults.recommendations.push({
                type: 'configuration',
                setting: 'work_mem',
                current: `${value}MB`,
                recommended: '4MB or higher',
                reason: 'Better for complex sorting and joins'
              });
            }
            break;
            
          case 'maintenance_work_mem':
            if (value < 64) {
              this.analysisResults.recommendations.push({
                type: 'configuration',
                setting: 'maintenance_work_mem',
                current: `${value}MB`,
                recommended: '64MB or higher',
                reason: 'Better for maintenance operations and index creation'
              });
            }
            break;
        }
      });
    } catch (error) {
      console.log('Could not analyze PostgreSQL settings:', error.message);
    }
  }

  async createRecommendedIndexes() {
    console.log('\n🔧 Creating recommended indexes...');
    
    const indexCreations = this.analysisResults.recommendations
      .filter(rec => rec.type === 'missing_index')
      .map(rec => {
        const indexName = rec.recommendation.split(' ')[2];
        const sql = rec.recommendation;
        return pool.query(sql);
      });
    
    try {
      await Promise.all(indexCreations);
      console.log(`✅ Created ${indexCreations.length} recommended indexes`);
    } catch (error) {
      console.error('Error creating indexes:', error);
    }
  }

  async updateStatistics() {
    console.log('\n📊 Updating table statistics...');
    
    try {
      await pool.query('ANALIZE tickets');
      await pool.query('ANALIZE hotels');
      await pool.query('ANALIZE users');
      await pool.query('ANALIZE ticket_comments');
      await pool.query('ANALIZE ticket_activity');
      await pool.query('ANALIZE audit_logs');
      
      console.log('✅ Statistics updated for all tables');
    } catch (error) {
      console.error('Error updating statistics:', error);
    }
  }

  printReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📈 DATABASE OPTIMIZATION REPORT');
    console.log('='.repeat(60));
    
    console.log(`\n📊 Tables Analyzed: ${this.analysisResults.tables.length}`);
    console.log(`📋 Indexes Analyzed: ${this.analysisResults.indexes.length}`);
    console.log(`⚡ Queries Analyzed: ${this.analysisResults.queries.length}`);
    console.log(`💡 Recommendations Generated: ${this.analysisResults.recommendations.length}`);
    
    // Group recommendations by type
    const groupedRecs = this.analysisResults.recommendations.reduce((groups, rec) => {
      groups[rec.type] = (groups[rec.type] || []).concat(rec);
      return groups;
    }, {});
    
    Object.entries(groupedRecs).forEach(([type, recs]) => {
      console.log(`\n${type.toUpperCase()} (${recs.length}):`);
      recs.forEach((rec, index) => {
        console.log(`  ${index + 1}. ${rec.recommendation || rec.reason}`);
      });
    });
    
    console.log('\n' + '='.repeat(60));
  }

  async applyOptimizations() {
    console.log('🚀 Applying database optimizations...');
    
    await this.createRecommendedIndexes();
    await this.updateStatistics();
    
    console.log('✅ Optimization completed!');
  }

  async generateOptimizationScript() {
    const sqlStatements = [];
    
    // Add index creation statements
    this.analysisResults.recommendations
      .filter(rec => rec.type === 'missing_index')
      .forEach(rec => {
        sqlStatements.push(rec.recommendation + ';');
      });
    
    // Add configuration statements
    sqlStatements.push('-- Performance tuning recommendations:');
    sqlStatements.push('ALTER SYSTEM SET shared_buffers = 256MB;');
    sqlStatements.push('ALTER SYSTEM SET work_mem = 4MB;');
    sqlStatements.push('ALTER SYSTEM SET maintenance_work_mem = 64MB;');
    sqlStatements.push('ALTER SYSTEM SET random_page_cost = 1.1;');
    sqlStatements.push('ALTER SYSTEM SET seq_page_cost = 1.0;');
    
    const script = sqlStatements.join('\n');
    
    const fs = require('fs');
    fs.writeFileSync('database-optimizations.sql', script);
    
    console.log('📁 Optimization script saved to: database-optimizations.sql');
    return script;
  }
}

// CLI interface
export async function optimizeDatabase() {
  const optimizer = new DatabaseOptimizer();
  
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case 'analyze':
      await optimizer.analyzeDatabase();
      break;
    case 'apply':
      await optimizer.applyOptimizations();
      break;
    case 'script':
      await optimizer.generateOptimizationScript();
      break;
    default:
      console.log('🔧 Database Optimization Tool');
      console.log('\nUsage:');
      console.log('  node optimize-db.js analyze   - Analyze database performance');
      console.log('  node optimize-db.js apply    - Apply recommended optimizations');
      console.log('  node optimize-db.js script   - Generate SQL optimization script');
      break;
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  optimizeDatabase();
}