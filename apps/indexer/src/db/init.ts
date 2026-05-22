import { readFileSync } from 'fs';
import { join } from 'path';
import { getPool } from './client';

async function initDb() {
  const pool = getPool();
  const schemaPath = join(__dirname, 'schema.sql');
  const schema = readFileSync(schemaPath, 'utf-8');

  console.log('[db] Initializing database schema...');
  await pool.query(schema);
  console.log('[db] Schema initialized successfully.');
  await pool.end();
}

initDb().catch((err) => {
  console.error('[db] Failed to initialize database:', err);
  process.exit(1);
});
