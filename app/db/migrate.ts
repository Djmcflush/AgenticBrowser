import { pool } from './index';
import fs from 'fs';
import path from 'path';

async function runMigrations() {
  const client = await pool.connect();

  try {
    // Create migrations table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Get list of migration files
    const migrationsDir = path.join(__dirname, 'migrations');
      const migrationFiles = fs.readdirSync(migrationsDir)
      .filter((file: string) => file.endsWith('.sql'))
      .sort();

    // Get already executed migrations
    const { rows: executedMigrations } = await client.query<{ name: string }>(
      'SELECT name FROM migrations'
    );
    const executedMigrationNames = new Set(
      executedMigrations.map((row: { name: string }) => row.name)
    );

    // Begin transaction
    await client.query('BEGIN');

    try {
      // Run each migration that hasn't been executed yet
      for (const file of migrationFiles) {
        if (!executedMigrationNames.has(file)) {
          console.log(`Running migration: ${file}`);
          
          const migrationPath = path.join(migrationsDir, file);
          const migrationSql = fs.readFileSync(migrationPath, 'utf8');
          
          await client.query(migrationSql);
          await client.query(
            'INSERT INTO migrations (name) VALUES ($1)',
            [file]
          );
          
          console.log(`Completed migration: ${file}`);
        }
      }

      // Commit transaction
      await client.query('COMMIT');
      console.log('All migrations completed successfully');
    } catch (error) {
      // Rollback transaction on error
      await client.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error running migrations:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrations();
}

export default runMigrations;
