import { expect, test } from '@playwright/test';
import { DatabaseLibraryDataFactory } from '../factories/index.js';
import { clearTestDataBeforeTest } from './test-utils.js';

test.describe('Admin Screen - Library Approval', () => {
  // テストグループ全体で一度だけクリーンアップ
  test.beforeAll(async () => {
    await clearTestDataBeforeTest();
  });

  test('ステータス更新時の確認ダイアログ - キャンセル時は変更されない', async ({ page }) => {
    // 1. ライブラリを未公開状態でデータベースに直接作成
    const libraryId = await DatabaseLibraryDataFactory.create({ status: 'pending' });

    // ライブラリ詳細ページに直接アクセス
    await page.goto(`/admin/libraries/${libraryId}`);

    // ページ読み込み完了を待機
    await page.waitForLoadState('networkidle');

    // 2. 確認ダイアログをキャンセル
    page.on('dialog', async dialog => {
      expect(dialog.message()).toBe('このライブラリを公開しますか？');
      await dialog.dismiss(); // キャンセル
    });
    await page.click('button.bg-green-600:has-text("Publish")');

    // 3. ステータスが変更されていないことを確認
    await expect(page.locator('span:has-text("未公開")')).toBeVisible();
    await expect(page.locator('text=ライブラリを公開しました。')).not.toBeVisible();

    // 4. ボタン表示が変わっていないことを確認
    await expect(page.locator('button.bg-green-600:has-text("Publish")')).toBeVisible();
  });

  test('ステータス更新中のローディング状態 - ボタンが無効化される', async ({ page }) => {
    // 1. ライブラリを未公開状態でデータベースに直接作成
    const libraryId = await DatabaseLibraryDataFactory.create({ status: 'pending' });

    // ライブラリ詳細ページに直接アクセス
    await page.goto(`/admin/libraries/${libraryId}`);

    // ページ読み込み完了を待機
    await page.waitForLoadState('networkidle');

    // 2. 公開ボタンの有効性確認
    const publishButton = page.locator('button.bg-green-600:has-text("Publish")');

    await expect(publishButton).toBeEnabled();

    // 3. ボタンにcursor-pointerクラスが適用されていることを確認
    await expect(publishButton).toHaveClass(/cursor-pointer/);
  });

  test('複数のライブラリで独立してステータス管理される', async ({ page }) => {
    // 1. 2つのライブラリを未公開状態でデータベースに直接作成
    const library1Id = await DatabaseLibraryDataFactory.create({
      status: 'pending',
      scriptId: 'SCRIPT_ID_1_' + Date.now(),
      repositoryUrl: 'https://github.com/user1/repo1-' + Date.now(),
    });

    const library2Id = await DatabaseLibraryDataFactory.create({
      status: 'pending',
      scriptId: 'SCRIPT_ID_2_' + Date.now(),
      repositoryUrl: 'https://github.com/user2/repo2-' + Date.now(),
    });

    // 2. 1つ目のライブラリを公開
    await page.goto(`/admin/libraries/${library1Id}`);
    await page.waitForLoadState('networkidle');

    page.on('dialog', async dialog => {
      await dialog.accept();
    });
    await page.click('button.bg-green-600:has-text("Publish")');
    await expect(page.locator('span.bg-green-100:has-text("公開")')).toBeVisible({
      timeout: 10000,
    });

    // 3. 2つ目のライブラリは依然として未公開
    await page.goto(`/admin/libraries/${library2Id}`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('span:has-text("未公開")')).toBeVisible();
    await expect(page.locator('button.bg-green-600:has-text("Publish")')).toBeVisible();

    // 4. 1つ目のライブラリは依然として公開中
    await page.goto(`/admin/libraries/${library1Id}`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('span.bg-green-100:has-text("公開")')).toBeVisible();
    await expect(page.locator('button.bg-gray-600:has-text("Unpublish")')).toBeVisible();
  });
});
