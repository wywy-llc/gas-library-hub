import { closePool } from '../scripts/db-pool.js';

async function globalTeardown(): Promise<void> {
  console.log('🧹 E2Eテスト後のクリーンアップを開始...');

  try {
    // DB接続プールを終了
    await closePool();
    console.log('✅ E2Eテストのクリーンアップが完了しました');
  } catch (error) {
    console.error('❌ E2Eテストのクリーンアップに失敗しました:', error);
    // クリーンアップ失敗はテスト全体を失敗させない
  }
}

export default globalTeardown;
