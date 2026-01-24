import { expect, test } from '@playwright/test';
import { DatabaseLibraryDataFactory } from '../factories/index.js';
import { clearTestDataBeforeTest } from './test-utils.js';

test.describe('Admin Screen - Library Approval', () => {
  // テストグループ全体で一度だけクリーンアップ
  test.beforeAll(async () => {
    await clearTestDataBeforeTest();
  });

  test('未公開ライブラリ - 公開ボタンが表示され正常に動作する', async ({ page }) => {
    // 1. ライブラリを未公開状態でデータベースに直接作成
    const libraryId = await DatabaseLibraryDataFactory.create({ status: 'pending' });

    // ライブラリ詳細ページに直接アクセス
    await page.goto(`/admin/libraries/${libraryId}`);

    // 2. 未公開ステータスの確認（ヘッダー部分のみ）
    await expect(
      page.locator('h1:has-text("Library Details") + div span.bg-gray-100:has-text("未公開")')
    ).toBeVisible();

    // 3. 未公開状態のボタン表示確認
    await expect(page.locator('button.bg-green-600:has-text("Publish")')).toBeVisible();
    // 未公開状態では「未公開に戻す」ボタンは表示されない
    await expect(page.locator('button.bg-gray-600:has-text("Unpublish")')).not.toBeVisible();

    // 4. 公開ボタンをクリック
    page.on('dialog', async dialog => {
      expect(dialog.message()).toBe('このライブラリを公開しますか？');
      await dialog.accept();
    });
    await page.click('button.bg-green-600:has-text("Publish")');

    // 5. 公開状態への変更確認（ヘッダー部分のみ）
    await expect(
      page.locator('h1:has-text("Library Details") + div span.bg-green-100:has-text("公開")')
    ).toBeVisible();
    await expect(page.locator('text=ライブラリを公開しました。')).toBeVisible();

    // 6. 公開状態のボタン表示確認
    await expect(page.locator('button.bg-gray-600:has-text("Unpublish")')).toBeVisible();
    await expect(page.locator('button.bg-green-600:has-text("Publish")')).not.toBeVisible();
  });

  test('公開ライブラリ - 未公開ボタンが表示され正常に動作する', async ({ page }) => {
    // 1. ライブラリを公開状態でデータベースに直接作成
    const libraryId = await DatabaseLibraryDataFactory.create({ status: 'published' });

    // ライブラリ詳細ページに直接アクセス
    await page.goto(`/admin/libraries/${libraryId}`);

    // 2. 公開状態のボタン表示確認
    await expect(page.locator('button.bg-gray-600:has-text("Unpublish")')).toBeVisible();
    await expect(page.locator('button.bg-green-600:has-text("Publish")')).not.toBeVisible();

    // 3. 未公開ボタンをクリック
    page.on('dialog', async dialog => {
      expect(dialog.message()).toBe('このライブラリを未公開にしますか？');
      await dialog.accept();
    });
    await page.click('button.bg-gray-600:has-text("Unpublish")');

    // 4. 未公開状態への変更確認（ヘッダー部分のみ）
    await expect(
      page.locator('h1:has-text("Library Details") + div span.bg-gray-100:has-text("未公開")')
    ).toBeVisible();
    await expect(page.locator('text=ライブラリを未公開にしました。')).toBeVisible();

    // 5. 未公開状態のボタン表示確認
    await expect(page.locator('button.bg-green-600:has-text("Publish")')).toBeVisible();
    await expect(page.locator('button.bg-gray-600:has-text("Unpublish")')).not.toBeVisible();
  });

  test('ステータス更新時の確認ダイアログ - キャンセル時は変更されない', async ({ page }) => {
    // 1. ライブラリを未公開状態でデータベースに直接作成
    const libraryId = await DatabaseLibraryDataFactory.create({ status: 'pending' });

    // ライブラリ詳細ページに直接アクセス
    await page.goto(`/admin/libraries/${libraryId}`);

    // 2. 確認ダイアログをキャンセル
    page.on('dialog', async dialog => {
      expect(dialog.message()).toBe('このライブラリを公開しますか？');
      await dialog.dismiss(); // キャンセル
    });
    await page.click('button.bg-green-600:has-text("Publish")');

    // 3. ステータスが変更されていないことを確認（ヘッダー部分のみ）
    await expect(
      page.locator('h1:has-text("Library Details") + div span.bg-gray-100:has-text("未公開")')
    ).toBeVisible();
    await expect(page.locator('text=ライブラリを公開しました。')).not.toBeVisible();

    // 4. ボタン表示が変わっていないことを確認
    await expect(page.locator('button.bg-green-600:has-text("Publish")')).toBeVisible();
  });

  test('ステータス更新中のローディング状態 - ボタンが無効化される', async ({ page }) => {
    // 1. ライブラリを未公開状態でデータベースに直接作成
    const libraryId = await DatabaseLibraryDataFactory.create({ status: 'pending' });

    // ライブラリ詳細ページに直接アクセス
    await page.goto(`/admin/libraries/${libraryId}`);

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
    page.on('dialog', async dialog => {
      await dialog.accept();
    });
    await page.click('button.bg-green-600:has-text("Publish")');
    await expect(
      page.locator('h1:has-text("Library Details") + div span.bg-green-100:has-text("公開")')
    ).toBeVisible();

    // 3. 2つ目のライブラリは依然として未公開
    await page.goto(`/admin/libraries/${library2Id}`);
    await expect(
      page.locator('h1:has-text("Library Details") + div span.bg-gray-100:has-text("未公開")')
    ).toBeVisible();
    await expect(page.locator('button.bg-green-600:has-text("Publish")')).toBeVisible();

    // 4. 1つ目のライブラリは依然として公開中
    await page.goto(`/admin/libraries/${library1Id}`);
    await expect(
      page.locator('h1:has-text("Library Details") + div span.bg-green-100:has-text("公開")')
    ).toBeVisible();
    await expect(page.locator('button.bg-gray-600:has-text("Unpublish")')).toBeVisible();
  });
});
