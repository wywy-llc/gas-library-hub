import { beginTransaction, clearTestData, isTransactionMode } from '../scripts/db-pool.js';
import { setupTestDatabase } from '../scripts/setup-test-db.js';

async function globalSetup(): Promise<void> {
  console.log('🔧 E2Eテスト前のセットアップを開始...');

  try {
    // E2Eテスト環境変数を設定（xAI API モックを有効化）
    process.env.PLAYWRIGHT_TEST_MODE = 'true';
    process.env.XAI_API_KEY = 'mock-api-key-for-e2e-testing';

    // テスト環境では言語を英語に固定
    process.env.PARAGLIDE_LOCALE = 'en';

    console.log('🤖 E2Eテストモードでxai Grok APIモックを有効化しました');
    console.log('🌐 E2Eテスト環境で言語を英語に固定しました');

    // テストデータベースをセットアップ
    await setupTestDatabase();

    // トランザクションモードの場合はトランザクションを開始
    // それ以外の場合は従来通りテストデータをクリア
    if (isTransactionMode()) {
      console.log('📝 トランザクションモードで実行します');
      await beginTransaction();
    } else {
      // テストデータをクリア（プール接続を使用）
      await clearTestData();
    }

    console.log('✅ E2Eテストのセットアップが完了しました');
  } catch (error) {
    console.error('❌ E2Eテストのセットアップに失敗しました:', error);
    throw error;
  }
}

export default globalSetup;
