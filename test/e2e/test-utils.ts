import type { Page } from '@playwright/test';
import { clearTestData } from '../scripts/db-pool.js';

/**
 * E2Eテスト用のユーティリティ関数
 */

/**
 * テストデータをクリアする
 * テストの前に呼び出して、データベースの状態をリセットする
 * ※プール接続を使用するため、接続オーバーヘッドが削減される
 */
export async function clearTestDataBeforeTest(): Promise<void> {
  try {
    await clearTestData();
  } catch (error) {
    console.error('❌ テストデータのクリアに失敗しました:', error);
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
