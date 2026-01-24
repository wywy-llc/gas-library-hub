#!/usr/bin/env node

/**
 * E2Eテスト実行スクリプト
 * Playwrightテスト実行 → クリーンアップ
 * （データベースセットアップはPlaywrightのglobalSetupで実行）
 */

import { spawn } from 'child_process';
import { config } from 'dotenv';
import { cleanupTestDatabase } from './cleanup-test-db.js';

// 環境変数を読み込み（メッセージ非表示）
config({ quiet: true });

/**
 * @param {string} command
 * @param {string[]} args
 * @param {object} options
 * @returns {Promise<void>}
 */
function runCommand(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    const childProcess = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      env: {
        ...process.env,
        // テスト環境変数を設定
        POSTGRES_USER: process.env.POSTGRES_USER || 'postgres',
        POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD || 'password',
        POSTGRES_DB: process.env.POSTGRES_TEST_DB || 'gas_library_hub_test_db',
        DATABASE_URL:
          process.env.DATABASE_TEST_URL ||
          `postgresql://${process.env.POSTGRES_USER || 'postgres'}:${process.env.POSTGRES_PASSWORD || 'password'}@${process.env.POSTGRES_HOST || 'localhost'}:${process.env.POSTGRES_PORT || '5433'}/${process.env.POSTGRES_TEST_DB || 'gas_library_hub_test_db'}`,
        NODE_ENV: 'test',
        GITHUB_TOKEN: process.env.GITHUB_TOKEN || '',
      },
      ...options,
    });

    childProcess.on('close', code => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });

    childProcess.on('error', reject);
  });
}

function checkGitHubToken() {
  if (!process.env.GITHUB_TOKEN) {
    console.error('❌ GITHUB_TOKEN環境変数が設定されていません。');
    console.error('');
    console.error('🔧 設定手順:');
    console.error('1. https://github.com/settings/tokens でPersonal Access Tokenを生成');
    console.error('2. スコープ: public_repo を選択');
    console.error('3. .envファイルのGITHUB_TOKEN=""に生成されたトークンを設定');
    console.error('');
    console.error('例: GITHUB_TOKEN="ghp_xxxxxxxxxxxxxxxxxxxx"');
    return false;
  }
  return true;
}

async function runE2ETests() {
  console.log('🚀 E2Eテスト実行開始...');

  // GITHUB_TOKEN事前チェック
  if (!checkGitHubToken()) {
    throw new Error(
      'GITHUB_TOKEN環境変数が設定されていません。上記の手順に従って設定してください。'
    );
  }

  try {
    // Playwrightテストを実行（データベースセットアップはglobalSetupで実行）
    console.log('🎭 Playwrightテストを実行中...');
    await runCommand('npx', ['playwright', 'test']);

    console.log('✅ E2Eテストが完了しました');
  } catch (error) {
    console.error('❌ E2Eテストに失敗しました:', error);
    throw error;
  } finally {
    // テスト用データベースをクリーンアップ（成功・失敗に関わらず実行）
    try {
      await cleanupTestDatabase();
    } catch (cleanupError) {
      console.error('⚠️  クリーンアップに失敗しました:', cleanupError);
    }
  }
}

async function main() {
  try {
    await runE2ETests();
    process.exit(0);
  } catch (error) {
    console.error('❌ E2Eテスト実行に失敗しました:', error);
    process.exit(1);
  }
}

// スクリプトが直接実行された場合のみ実行
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
