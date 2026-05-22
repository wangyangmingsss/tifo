import dotenv from 'dotenv';
dotenv.config();

import { readFileSync } from 'fs';
import { join } from 'path';
import { getPool } from './db/client';
import { EventIndexer } from './indexer/eventListener';
import { startServer } from './api/server';

async function initDatabase() {
  const pool = getPool();
  const schemaPath = join(__dirname, 'db', 'schema.sql');
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
