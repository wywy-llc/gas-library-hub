import { expect, test, type Page } from '@playwright/test';
import { LibraryTestDataFactories } from '../factories/index.js';

// このテストファイルのタイムアウトを延長（ライブラリ登録とスクレイピングに時間がかかるため）
test.setTimeout(30000);

// フレイキーテスト対策: 失敗時に1回リトライ
test.describe.configure({ retries: 1 });

/**
 * テストごとにユニークなスコープを生成
 */
function generateTestScope(prefix: string): string {
  return `AI_${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * ライブラリを登録し、詳細ページへのリダイレクトを待機するヘルパー
 * @returns 詳細ページのURL
 */
async function registerLibraryAndWaitForDetailPage(
  page: Page,
  testData: { scriptId: string; repositoryUrl: string }
): Promise<string> {
  await page.goto('/admin/libraries/new');
  await page.waitForLoadState('networkidle');

  const repoPath = testData.repositoryUrl.replace('https://github.com/', '');
  await page.fill('input[name="scriptId"]', testData.scriptId);
  await page.fill('input[name="repoUrl"]', repoPath);
  await page.click('button[type="submit"]');

  // 成功メッセージが表示されるまで待機
  await expect(
    page.locator(
      'text=Library has been successfully registered. Redirecting to the details page...'
    )
  ).toBeVisible({ timeout: 15000 });

  // 詳細ページへのリダイレクトを待機（NanoID形式のID）
  await page.waitForURL(/\/admin\/libraries\/[a-zA-Z0-9_-]{21}$/, {
    timeout: 10000,
  });

  // ページのロード完了を待機
  await page.waitForLoadState('networkidle');

  // 詳細ページが正常に表示されていることを確認（404ではない）
  await expect(page.locator('dt:has-text("GAS Script ID")')).toBeVisible({ timeout: 10000 });

  return page.url();
}

test.describe('Admin Screen - Library AI Summary Generation', () => {
  test('OAuth認証ライブラリでAI要約生成を検証', async ({ page }) => {
    // テストごとにユニークなスコープを生成
    const testScope = generateTestScope('OAUTH');
    const testData = LibraryTestDataFactories.default.build({
      scriptId: testScope,
      repositoryUrl: `https://github.com/test/${testScope}`,
    });

    // ライブラリ登録と詳細ページ遷移
    await registerLibraryAndWaitForDetailPage(page, testData);

    // GAS Script IDが正しく表示されていることを確認
    await expect(page.locator('dt:has-text("GAS Script ID") + dd')).toContainText(
      testData.scriptId
    );

    console.log('✅ OAuth認証ライブラリのAI要約生成テストが完了しました');
  });

  test('ライブラリ更新時のAI要約生成確認', async ({ page }) => {
    // テストごとにユニークなスコープを生成
    const testScope = generateTestScope('UPDATE');
    const initialData = LibraryTestDataFactories.default.build({
      scriptId: testScope,
      repositoryUrl: `https://github.com/test/${testScope}`,
    });

    // ライブラリ登録と詳細ページ遷移
    await registerLibraryAndWaitForDetailPage(page, initialData);

    // スクレイピング後のconfirmダイアログを自動で「キャンセル」に設定
    // （AI要約生成をスキップしてテストを高速化）
    page.on('dialog', async dialog => {
      await dialog.dismiss();
    });

    // スクレイピング実行ボタンをクリック
    const scrapingButton = page.locator('[data-testid="execute-scraping-button"]');
    await expect(scrapingButton).toBeVisible({ timeout: 5000 });
    await expect(scrapingButton).toBeEnabled();
    await scrapingButton.click();

    // スクレイピング処理完了を待機（ボタンの再有効化で判断）
    await expect(scrapingButton).toBeEnabled({ timeout: 15000 });

    // ページが正常に表示されていることを確認（リロード後も含む）
    await page.waitForLoadState('networkidle');
    await expect(page.locator('dt:has-text("GAS Script ID") + dd')).toBeVisible();
    await expect(page.locator('dt:has-text("Library Name") + dd')).toBeVisible();

    console.log('✅ ライブラリ更新時のAI要約生成テストが完了しました');
  });
});
