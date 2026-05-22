import dotenv from 'dotenv';
dotenv.config();

import { readFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import { getPool } from './db/client';
import { EventIndexer } from './indexer/eventListener';
import { startServer } from './api/server';

async function initDatabase() {
  const pool = getPool();
  // Try multiple possible locations for schema.sql
  const candidates = [
    join(__dirname, 'db', 'schema.sql'),           // dist/db/schema.sql
    resolve(__dirname, '..', 'src', 'db', 'schema.sql'), // src/db/schema.sql (from dist/)
  ];
  let schemaPath = candidates.find(p => existsSync(p));
  if (!schemaPath) {
    console.error('[main] schema.sql not found in:', candidates);
    process.exit(1);
  }
  const schema = readFileSync(schemaPath, 'utf-8');
  console.log('[main] Initializing database schema...');
  await pool.query(schema);
  console.log('[main] Database schema ready.');
}

async function main() {
  console.log('===========================================');
  console.log('  TIFO Indexer — X Layer Event Indexer');
  console.log('  Chain: X Layer Testnet (195)');
  console.log('===========================================');

  // 1. Initialize database
  await initDatabase();

  // 2. Start REST API server
  const server = startServer();

  // 3. Start event indexer
  const indexer = new EventIndexer();
  indexer.start();

  // Graceful shutdown
  const shutdown = async () => {
    console.log('\n[main] Shutting down...');
    indexer.stop();
    server.close();
    const pool = getPool();
    await pool.end();
    console.log('[main] Goodbye.');
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('[main] Fatal error:', err);
  process.exit(1);
});
