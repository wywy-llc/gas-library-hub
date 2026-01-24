import type { Page } from '@playwright/test';
import {
  clearTestData,
  createSavepoint,
  isTransactionMode,
  rollbackToSavepoint,
} from '../scripts/db-pool.js';

/**
 * E2Eテスト用のユーティリティ関数
 */

// 現在のセーブポイント名を保持
let currentSavepoint: string | null = null;

/**
 * テストデータをクリアする
 * テストの前に呼び出して、データベースの状態をリセットする
 *
 * トランザクションモード（E2E_TRANSACTION_MODE=true）の場合:
 * - セーブポイントを作成
 *
 * 通常モードの場合:
 * - DELETE文でデータをクリア
 *
 * ※プール接続を使用するため、接続オーバーヘッドが削減される
 */
export async function clearTestDataBeforeTest(): Promise<void> {
  try {
    if (isTransactionMode()) {
      // トランザクションモード: セーブポイントを作成
      currentSavepoint = await createSavepoint();
    } else {
      // 通常モード: DELETEでクリア
      await clearTestData();
    }
  } catch (error) {
    console.error('❌ テストデータのクリアに失敗しました:', error);
    throw error;
  }
}

/**
 * テストデータをロールバックする
 * テストの後に呼び出して、データベースの状態を戻す
 *
 * トランザクションモード（E2E_TRANSACTION_MODE=true）の場合のみ有効
 * 通常モードでは何もしない
 */
export async function rollbackTestData(): Promise<void> {
  try {
    if (isTransactionMode() && currentSavepoint) {
      await rollbackToSavepoint(currentSavepoint);
      currentSavepoint = null;
    }
  } catch (error) {
    console.error('❌ テストデータのロールバックに失敗しました:', error);
    throw error;
  }
}

/**
 * E2Eテスト用に言語を英語に設定する
 * @param page Playwrightページオブジェクト
 */
export async function setLocaleToEnglish(page: Page): Promise<void> {
  // Paraglide JSのクッキーを英語に設定
  await page.addInitScript(() => {
    document.cookie = 'PARAGLIDE_LOCALE=en; path=/; max-age=34560000';
    // globalVariableストラテジーでも英語に設定
    // cspell:disable-next-line
    (globalThis as Record<string, unknown>).__paraglide = { locale: 'en' };
  });
}

// プール接続のclearTestDataを再エクスポート
export { clearTestData };
