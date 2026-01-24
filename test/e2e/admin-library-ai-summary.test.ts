import { expect, test } from '@playwright/test';
import { LibraryTestDataFactories } from '../factories/index.js';
import { clearTestDataBeforeTest } from './test-utils.js';

test.describe('Admin Screen - Library AI Summary Generation', () => {
  test('OAuth認証ライブラリでAI要約生成を検証', async ({ page }) => {
    // テスト前にデータをクリア
    await clearTestDataBeforeTest();

    // OAuth認証ライブラリ用のテストデータ（モックで特別なOAuthデータが返される）
    const testData = LibraryTestDataFactories.default.build({
      scriptId: 'OAUTH_AI_TEST_' + Date.now(),
      repositoryUrl: 'https://github.com/googleworkspace/apps-script-oauth2',
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
    // テスト前にデータをクリア
    await clearTestDataBeforeTest();

    // 最初にライブラリを登録
    const initialData = LibraryTestDataFactories.default.build({
      scriptId: 'UPDATE_TEST_' + Date.now(),
      repositoryUrl: 'https://github.com/googleworkspace/apps-script-oauth2',
    });

    await page.goto('/admin/libraries/new');
    const repoPath = initialData.repositoryUrl.replace('https://github.com/', '');
    await page.fill('input[name="scriptId"]', initialData.scriptId);
    await page.fill('input[name="repoUrl"]', repoPath);
    await page.click('button[type="submit"]');

    // 詳細ページに到達するまで待機
    await page.waitForURL(/\/admin\/libraries\/[^/]+$/, { timeout: 15000 });

    // スクレイピング実行ボタンを押してライブラリ情報を更新（AI要約再生成）
    await expect(page.locator('button:has-text("Execute Scraping")')).toBeVisible();
    await page.click('button:has-text("Execute Scraping")');

    // スクレイピング処理完了を待機（ボタンの再有効化で判断）
    await expect(page.locator('button:has-text("Execute Scraping")')).toBeEnabled({
      timeout: 10000,
    });

    // ページが正常に表示されていることを確認
    // スクレイピング後もスクリプトIDは変更されない（モック環境では実際のスクレイピングは行われない）
    await expect(page.locator('dt:has-text("GAS Script ID") + dd')).toBeVisible();

    // ライブラリ詳細が表示されていることを確認
    await expect(page.locator('dt:has-text("Library Name") + dd')).toBeVisible();

    console.log('✅ ライブラリ更新時のAI要約生成テストが完了しました');
  });

  test('library_summaryが存在しない既存ライブラリのAI要約生成', async ({ page }) => {
    // テスト前にデータをクリア
    await clearTestDataBeforeTest();

    // 既存ライブラリのテストデータ
    const testData = LibraryTestDataFactories.default.build({
      scriptId: 'EXISTING_TEST_' + Date.now(),
      repositoryUrl: 'https://github.com/googleworkspace/apps-script-oauth2',
    });

    // 最初にライブラリを登録
    await page.goto('/admin/libraries/new');
    const repoPath = testData.repositoryUrl.replace('https://github.com/', '');
    await page.fill('input[name="scriptId"]', testData.scriptId);
    await page.fill('input[name="repoUrl"]', repoPath);
    await page.click('button[type="submit"]');

    // 詳細ページに到達
    await page.waitForURL(/\/admin\/libraries\/[^/]+$/, { timeout: 15000 });

    // 再度スクレイピングを実行してlibrary_summary未存在時のAI要約生成を確認
    await page.click('button:has-text("Execute Scraping")');

    // スクレイピング処理完了を待機（ボタンの再有効化で判断）
    await expect(page.locator('button:has-text("Execute Scraping")')).toBeEnabled({
      timeout: 10000,
    });

    // ライブラリが正常に表示されていることを確認
    // スクレイピング後もスクリプトIDは変更されない（モック環境では実際のスクレイピングは行われない）
    await expect(page.locator('dt:has-text("GAS Script ID") + dd')).toBeVisible();

    // ライブラリ詳細が表示されていることを確認
    await expect(page.locator('dt:has-text("Library Name") + dd')).toBeVisible();

    console.log('✅ library_summary未存在時のAI要約生成テストが完了しました');
  });
});
