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

  // 全体では1ワーカー（ファイル単位で順次実行を保証）
  // fullyParallelでファイル内の並列化を制御
  workers: 1,

  use: {
    browserName: 'chromium',
    actionTimeout: 5000, // アクション: 5秒
    navigationTimeout: 10000, // ナビゲーション: 10秒
    baseURL: `http://localhost:${TEST_PORT}`,
  },

  // プロジェクト設定: テストを特性別にグループ化
  projects: [
    {
      name: 'readonly-api',
      testMatch: '**/public-library-api.test.ts',
      // 読み取り専用APIテストはファイル内のテストを並列実行可能
      fullyParallel: true,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'admin-sequential',
      testMatch: '**/admin-library-*.test.ts',
      dependencies: ['readonly-api'], // APIテスト完了後に実行
      // データ変更があるためファイル内のテストも順次実行
      fullyParallel: false,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'misc',
      testMatch: '**/demo.test.ts',
      dependencies: ['readonly-api'], // APIテスト完了後に実行
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
