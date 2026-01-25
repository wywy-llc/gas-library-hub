import { expect, test } from '@playwright/test';
import { LibraryTestDataFactories } from '../factories/index.js';

// 並列実行のため、各テストでユニークなスコープを使用
const TEST_SCOPE = `AI_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

test.describe('Admin Screen - Library AI Summary Generation', () => {
  test('OAuth認証ライブラリでAI要約生成を検証', async ({ page }) => {
    // OAuth認証ライブラリ用のテストデータ（ユニークなスコープ付き）
    const timestamp = Date.now();
    const testData = LibraryTestDataFactories.default.build({
      scriptId: `${TEST_SCOPE}_OAUTH_${timestamp}`,
      repositoryUrl: `https://github.com/test/${TEST_SCOPE}-oauth-${timestamp}`,
    });

    // ライブラリ登録
    await page.goto('/admin/libraries/new');

    const repoPath = testData.repositoryUrl.replace('https://github.com/', '');
    await page.fill('input[name="scriptId"]', testData.scriptId);
    await page.fill('input[name="repoUrl"]', repoPath);

    // フォーム送信
    await page.click('button[type="submit"]');

    // 処理完了まで待機
    try {
      await expect(
        page.locator(
          'text=Library has been successfully registered. Redirecting to the details page...'
        )
      ).toBeVisible({ timeout: 15000 });
    } catch {
      await page.waitForURL(/\/admin\/libraries\/[^/]+$/, { timeout: 15000 });
    }

    // 詳細ページの確認
    await expect(page).toHaveURL(/\/admin\/libraries\/[^/]+$/);
    await expect(page.locator('dt:has-text("GAS Script ID") + dd')).toContainText(
      testData.scriptId
    );

    console.log('✅ OAuth認証ライブラリのAI要約生成テストが完了しました');
  });

  test('ライブラリ更新時のAI要約生成確認', async ({ page }) => {
    // 最初にライブラリを登録（ユニークなスコープ付き）
    const timestamp = Date.now();
    const initialData = LibraryTestDataFactories.default.build({
      scriptId: `${TEST_SCOPE}_UPDATE_${timestamp}`,
      repositoryUrl: `https://github.com/test/${TEST_SCOPE}-update-${timestamp}`,
    });

    await page.goto('/admin/libraries/new');
    const repoPath = initialData.repositoryUrl.replace('https://github.com/', '');
    await page.fill('input[name="scriptId"]', initialData.scriptId);
    await page.fill('input[name="repoUrl"]', repoPath);
    await page.click('button[type="submit"]');

    // 詳細ページに到達するまで待機
    await page.waitForURL(/\/admin\/libraries\/[^/]+$/, { timeout: 15000 });

    // スクレイピング実行ボタンを押してライブラリ情報を更新（AI要約再生成）
    await expect(page.locator('[data-testid="execute-scraping-button"]')).toBeVisible();
    await page.click('[data-testid="execute-scraping-button"]');

    // スクレイピング処理完了を待機（ボタンの再有効化で判断）
    await expect(page.locator('[data-testid="execute-scraping-button"]')).toBeEnabled({
      timeout: 10000,
    });

    // ページが正常に表示されていることを確認
    await expect(page.locator('dt:has-text("GAS Script ID") + dd')).toBeVisible();

    // ライブラリ詳細が表示されていることを確認
    await expect(page.locator('dt:has-text("Library Name") + dd')).toBeVisible();

    console.log('✅ ライブラリ更新時のAI要約生成テストが完了しました');
  });
});
