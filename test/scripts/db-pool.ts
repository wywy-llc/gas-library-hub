/**
 * E2Eテスト用DB接続プール
 * テスト実行中に単一の接続を再利用してオーバーヘッドを削減
 */

import { config } from 'dotenv';
import { sql } from 'drizzle-orm';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

// 環境変数を読み込み
config({ quiet: true });

const TEST_DB_NAME = process.env.POSTGRES_TEST_DB || 'gas_library_hub_test_db';

// 接続プール設定
const poolConfig = {
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5433', 10),
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: TEST_DB_NAME,
  max: 5, // 最大接続数
  idleTimeoutMillis: 30000, // アイドル接続のタイムアウト
  connectionTimeoutMillis: 5000, // 接続タイムアウト
};

// シングルトンプールインスタンス
let pool: Pool | null = null;
let db: NodePgDatabase | null = null;

/**
 * DB接続プールを取得（遅延初期化）
 */
export function getPool(): Pool {
  if (!pool) {
    pool = new Pool(poolConfig);
  }
  return pool;
}

/**
 * Drizzle DBインスタンスを取得（遅延初期化）
 */
export function getDb(): NodePgDatabase {
  if (!db) {
    db = drizzle(getPool());
  }
  return db;
}

/**
 * テストデータをクリア（プール接続を使用）
 */
export async function clearTestData(): Promise<void> {
  const database = getDb();

  // 外部キー制約を考慮した削除順序で全テーブルのデータをクリア
  await database.execute(sql`DELETE FROM "library_summary"`);
  await database.execute(sql`DELETE FROM "library"`);
  await database.execute(sql`DELETE FROM "user"`);
}

/**
 * 接続プールを終了（globalTeardownで呼び出し）
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    db = null;
  }
}

export type { NodePgDatabase };
