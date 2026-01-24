import { expect, test } from '@playwright/test';
import { clearTestDataBeforeTest } from './test-utils.js';

test.describe('Admin Screen - Library Functions (Basic)', () => {
  test('googleworkspace/apps-script-oauth2の登録テスト', async ({ page }) => {
    await clearTestDataBeforeTest();

    const testData = {
      scriptId: '1B7FSrk5Zi6L1rSxxTDgDEUsPzlukDsi4KGuTMorsTQHhGBzBkMun4iDF',
      repoUrl: 'googleworkspace/apps-script-oauth2',
      expectedName: 'apps-script-oauth2',
      expectedAuthor: 'googleworkspace',
      expectedDescription: 'An OAuth2 library for Google Apps Script.',
    };

    // 1. 新規ライブラリ追加ページにアクセス
    await page.goto('/admin/libraries/new');

    // 2. フォーム入力
    await page.fill('input[name="scriptId"]', testData.scriptId);
    await page.fill('input[name="repoUrl"]', testData.repoUrl);

    // 3. フォーム送信
    await page.click('button[type="submit"]');

    // 4. 成功メッセージの確認
    await expect(page.locator('text=Library has been successfully registered')).toBeVisible({
      timeout: 10000,
    });

    // 5. 詳細ページへのリダイレクトを待機
    await page.waitForURL(/\/admin\/libraries\/[^/]+$/, { timeout: 15000 });

    // 6. 詳細ページの重要な情報を確認
    await expect(page.locator('h1:has-text("Library Details")')).toBeVisible();
    await expect(
      page.locator('dd').filter({ hasText: testData.expectedName }).first()
    ).toBeVisible();
    await expect(page.locator(`text=${testData.scriptId.substring(0, 20)}`).first()).toBeVisible();
    await expect(page.locator(`text=${testData.expectedAuthor}`).first()).toBeVisible();
    await expect(page.locator(`text=${testData.expectedDescription}`).first()).toBeVisible();

    // 7. ステータス・管理者機能ボタンの確認
    await expect(
      page.locator('h1:has-text("Library Details") + div span.bg-gray-100:has-text("未公開")')
    ).toBeVisible();
    await expect(page.locator('h2:has-text("Overview")')).toBeVisible();
    await expect(page.locator('button:has-text("Execute Scraping")')).toBeVisible();
    await expect(page.locator('button:has-text("Edit")')).toBeVisible();
    await expect(page.locator('button.bg-green-600:has-text("Publish")')).toBeVisible();
  });

  test('管理者トップページのリダイレクト確認', async ({ page }) => {
    // /admin にアクセス
    await page.goto('/admin');

    // /admin/libraries にリダイレクトされることを確認
    await expect(page).toHaveURL('/admin/libraries');
  });
});
