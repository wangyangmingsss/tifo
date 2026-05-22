import { Pool, PoolClient } from 'pg';
import { config } from '../config';

let pool: Pool;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({ connectionString: config.databaseUrl });
  }
  return pool;
}

export async function query(text: string, params?: any[]) {
  const pool = getPool();
  return pool.query(text, params);
}

export async function getClient(): Promise<PoolClient> {
  const pool = getPool();
  return pool.connect();
}

export async function transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Indexer cursor helpers
export async function getLastIndexedBlock(): Promise<bigint> {
  const res = await query(
    `SELECT value FROM indexer_state WHERE key = 'last_indexed_block'`
  );
  if (res.rows.length === 0) return config.startBlock;
  return BigInt(res.rows[0].value);
}

export async function setLastIndexedBlock(blockNumber: bigint): Promise<void> {
  await query(
    `INSERT INTO indexer_state (key, value, updated_at)
     VALUES ('last_indexed_block', $1, NOW())
     ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
    [blockNumber.toString()]
  );
}
