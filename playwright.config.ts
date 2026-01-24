import { defineConfig } from '@playwright/test';
import { config } from 'dotenv';

// 環境変数を読み込み（メッセージ非表示）
config({ quiet: true });

export default defineConfig({
  globalSetup: './test/e2e/global-setup.ts',
  globalTeardown: './test/e2e/global-teardown.ts',
  workers: 1, // テストを順次実行してデータ競合を防ぐ
  fullyParallel: false, // 並列実行を無効化
  use: {
    browserName: 'chromium', // Chromiumのみ使用
  },
  webServer: {
    command: 'npm run build && npm run preview',
    port: 4173,
    env: {
      DATABASE_URL: process.env.DATABASE_TEST_URL || process.env.DATABASE_URL || '',
      POSTGRES_USER: process.env.POSTGRES_USER || '',
      POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD || '',
      POSTGRES_DB: process.env.POSTGRES_TEST_DB || process.env.POSTGRES_DB || '',
      NODE_ENV: 'test',
      PLAYWRIGHT_TEST_MODE: 'true',
      XAI_API_KEY: 'mock-api-key-for-e2e-testing',
      GITHUB_TOKEN: process.env.GITHUB_TOKEN || '',
      PARAGLIDE_LOCALE: 'en',
    },
  },
  testDir: 'test/e2e',
});
