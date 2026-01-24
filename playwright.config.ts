import { defineConfig, devices } from '@playwright/test';
import { config } from 'dotenv';

// 環境変数を読み込み（メッセージ非表示）
config({ quiet: true });

const isCI = process.env.CI === 'true';

// テスト専用ポート（開発サーバーと競合しないよう別ポート）
const TEST_PORT = 5174;

// 共通の環境変数設定
const serverEnv = {
  DATABASE_URL: process.env.DATABASE_TEST_URL || process.env.DATABASE_URL || '',
  POSTGRES_USER: process.env.POSTGRES_USER || '',
  POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD || '',
  POSTGRES_DB: process.env.POSTGRES_TEST_DB || process.env.POSTGRES_DB || '',
  NODE_ENV: 'test',
  PLAYWRIGHT_TEST_MODE: 'true',
  XAI_API_KEY: 'mock-api-key-for-e2e-testing',
  GITHUB_TOKEN: process.env.GITHUB_TOKEN || '',
  PARAGLIDE_LOCALE: 'en',
};

export default defineConfig({
  globalSetup: './test/e2e/global-setup.ts',
  globalTeardown: './test/e2e/global-teardown.ts',

  // タイムアウト設定（短縮して早期失敗検知）
  timeout: 10000, // 各テスト: 10秒
  expect: {
    timeout: 5000, // expect: 5秒
  },

  // ワーカー数を増やして並列実行（テストファイル単位）
  workers: 4,

  use: {
    browserName: 'chromium',
    actionTimeout: 5000, // アクション: 5秒
    navigationTimeout: 10000, // ナビゲーション: 10秒
    baseURL: `http://localhost:${TEST_PORT}`,
  },

  // プロジェクト設定: テストファイルごとに独立したプロジェクトを定義
  // 各プロジェクトは独自のデータを作成するため、並列実行可能
  projects: [
    // 読み取り専用APIテスト（最初に実行、ファイル内も並列）
    {
      name: 'readonly-api',
      testMatch: '**/public-library-api.test.ts',
      fullyParallel: true,
      use: { ...devices['Desktop Chrome'] },
    },

    // 管理者テスト: 各ファイルを独立プロジェクトとして並列実行
    {
      name: 'admin-registration',
      testMatch: '**/admin-library-registration.test.ts',
      dependencies: ['readonly-api'],
      fullyParallel: false, // ファイル内は順次（データ依存あり）
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'admin-approval',
      testMatch: '**/admin-library-approval.test.ts',
      dependencies: ['readonly-api'],
      fullyParallel: false,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'admin-ai-summary',
      testMatch: '**/admin-library-ai-summary.test.ts',
      dependencies: ['readonly-api'],
      fullyParallel: false,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'admin-bulk-api',
      testMatch: '**/admin-library-bulk-api.test.ts',
      dependencies: ['readonly-api'],
      fullyParallel: false,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'admin-basic',
      testMatch: '**/admin-library-basic.test.ts',
      dependencies: ['readonly-api'],
      fullyParallel: false,
      use: { ...devices['Desktop Chrome'] },
    },

    // その他のテスト
    {
      name: 'misc',
      testMatch: '**/demo.test.ts',
      dependencies: ['readonly-api'],
      fullyParallel: false,
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // webServer設定
  // 認証バイパスにNODE_ENV=testが必要なため、専用ポートでサーバーを起動
  webServer: isCI
    ? {
        // CI: フルビルド + preview
        command: 'npm run build && npm run preview',
        port: 4173,
        reuseExistingServer: false,
        env: serverEnv,
      }
    : {
        // ローカル: テスト専用ポートでdev serverを起動
        // NODE_ENV=testで認証バイパス有効化
        command: `npm run dev -- --port ${TEST_PORT}`,
        port: TEST_PORT,
        reuseExistingServer: false, // 常に新しいサーバーを起動
        env: serverEnv,
      },

  testDir: 'test/e2e',
});
