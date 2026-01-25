#!/usr/bin/env node

/**
 * テストデータクリアスクリプト
 * E2Eテスト前にlibraryテーブルのデータをクリアする
 */

import { config } from 'dotenv';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Client } from 'pg';

// 環境変数を読み込み（メッセージ非表示）
config({ quiet: true });

const TEST_DB_NAME = process.env.POSTGRES_TEST_DB || 'gas_library_hub_test_db';
const POSTGRES_CONFIG = {
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5433', 10),
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: TEST_DB_NAME,
};

async function clearTestData() {
  const client = new Client(POSTGRES_CONFIG);

  try {
    await client.connect();
    const db = drizzle(client);

    // 外部キー制約を考慮した削除順序で全テーブルのデータをクリア
    // Sample関連テーブル（依存順）
    await db.execute(sql`DELETE FROM "user_notification"`);
    await db.execute(sql`DELETE FROM "sample_like"`);
    await db.execute(sql`DELETE FROM "sample_copy"`);
    await db.execute(sql`DELETE FROM "sample_code"`);
    // Library関連テーブル
    await db.execute(sql`DELETE FROM "library_summary"`);
    await db.execute(sql`DELETE FROM "library"`);
    // User（最後に削除）
    await db.execute(sql`DELETE FROM "user"`);
  } catch (error) {
    console.error('❌ データクリアエラー:', error);
    throw error;
  } finally {
    await client.end();
  }
}

async function main() {
  try {
    await clearTestData();
    process.exit(0);
  } catch (error) {
    console.error('❌ データクリアに失敗しました:', error);
    process.exit(1);
  }
}

// スクリプトが直接実行された場合のみ実行
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { clearTestData };
