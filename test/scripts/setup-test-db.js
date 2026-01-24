#!/usr/bin/env node

/**
 * テスト用データベースのセットアップスクリプト
 * E2Eテスト実行前にテスト専用のデータベースを作成・初期化する
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
};

async function setupTestDatabase() {
  console.log('🔧 テスト用データベースのセットアップを開始...');

  // 1. PostgreSQLサーバーに接続（デフォルトDBに接続）
  const adminClient = new Client({
    ...POSTGRES_CONFIG,
    database: 'postgres', // デフォルトDB
  });

  try {
    await adminClient.connect();
    console.log('✅ PostgreSQLサーバーに接続しました');

    // 2. テスト用データベースが存在する場合は削除
    try {
      await adminClient.query(`DROP DATABASE IF EXISTS "${TEST_DB_NAME}"`);
      console.log(`🗑️  既存のテストDB "${TEST_DB_NAME}" を削除しました`);
    } catch {
      console.log('ℹ️  テストDBは存在しませんでした');
    }

    // 3. テスト用データベースを新規作成
    await adminClient.query(`CREATE DATABASE "${TEST_DB_NAME}"`);
    console.log(`✅ テストDB "${TEST_DB_NAME}" を作成しました`);
  } catch (error) {
    console.error('❌ データベース作成エラー:', error);
    throw error;
  } finally {
    await adminClient.end();
  }

  // 4. テスト用データベースに接続してスキーマを作成
  const testClient = new Client({
    ...POSTGRES_CONFIG,
    database: TEST_DB_NAME,
  });

  try {
    await testClient.connect();
    console.log(`✅ テストDB "${TEST_DB_NAME}" に接続しました`);

    // 5. Drizzle ORMでスキーマを作成
    const db = drizzle(testClient);

    // スキーマを手動で作成（マイグレーションファイルがない場合）
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "user" (
        "id" text PRIMARY KEY NOT NULL,
        "email" text NOT NULL UNIQUE,
        "name" text NOT NULL,
        "picture" text,
        "google_id" text NOT NULL UNIQUE,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "session" (
        "id" text PRIMARY KEY NOT NULL,
        "user_id" text NOT NULL,
        "expires_at" timestamp with time zone NOT NULL,
        FOREIGN KEY ("user_id") REFERENCES "user"("id")
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "library" (
        "id" text PRIMARY KEY NOT NULL,
        "name" text NOT NULL,
        "script_id" text NOT NULL UNIQUE,
        "repository_url" text NOT NULL UNIQUE,
        "author_url" text NOT NULL,
        "author_name" text NOT NULL,
        "description" text NOT NULL,
        "star_count" integer DEFAULT 0 NOT NULL,
        "copy_count" integer DEFAULT 0 NOT NULL,
        "license_type" text NOT NULL,
        "license_url" text NOT NULL,
        "last_commit_at" timestamp with time zone NOT NULL,
        "status" text DEFAULT 'pending' NOT NULL CHECK ("status" IN ('pending', 'published', 'rejected')),
        "script_type" text DEFAULT 'library' NOT NULL CHECK ("script_type" IN ('library', 'web_app')),
        "script_validation_status" text CHECK ("script_validation_status" IN ('accessible', 'inaccessible', 'not_found', 'unknown')),
        "requester_id" text,
        "request_note" text,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
        FOREIGN KEY ("requester_id") REFERENCES "user"("id")
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "library_summary" (
        "id" text PRIMARY KEY NOT NULL,
        "library_id" text NOT NULL UNIQUE,
        "library_name_ja" text,
        "library_name_en" text,
        "purpose_ja" text,
        "purpose_en" text,
        "target_users_ja" text,
        "target_users_en" text,
        "tags_ja" jsonb,
        "tags_en" jsonb,
        "core_problem_ja" text,
        "core_problem_en" text,
        "main_benefits" jsonb,
        "usage_example_ja" text,
        "usage_example_en" text,
        "usage_example" jsonb,
        "seo_title_ja" text,
        "seo_title_en" text,
        "seo_description_ja" text,
        "seo_description_en" text,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
        FOREIGN KEY ("library_id") REFERENCES "library"("id")
      );
    `);

    console.log('✅ データベーススキーマを作成しました');
  } catch (error) {
    console.error('❌ スキーマ作成エラー:', error);
    throw error;
  } finally {
    await testClient.end();
  }

  console.log('🎉 テスト用データベースのセットアップが完了しました');
}

async function main() {
  try {
    await setupTestDatabase();
    process.exit(0);
  } catch (error) {
    console.error('❌ セットアップに失敗しました:', error);
    process.exit(1);
  }
}

// スクリプトが直接実行された場合のみ実行
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { setupTestDatabase };
