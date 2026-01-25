import { expect, test } from '@playwright/test';

test.describe('Admin Screen - Library Bulk Register API', () => {
  test('管理画面一括登録でパラメータ検証エラーが適切に処理される', async ({ page }) => {
    // 管理画面にアクセス
    await page.goto('/admin/libraries');

    // ページが読み込まれるまで待機
    await page.waitForLoadState('networkidle');

    // 一括新規追加ボタンをクリックしてフォームを表示
    const bulkAddButton = page.locator('button:has-text("一括新規追加")');
    await expect(bulkAddButton).toBeVisible();
    await bulkAddButton.click();

    // 不正な検索条件を設定（開始ページ > 終了ページ）
    await page.locator('input[name="startPage"]').fill('5');
    await page.locator('input[name="endPage"]').fill('3');
    await page.locator('select[name="perPage"]').selectOption('10');

    // タグを選択
    await page.locator('input[name="selectedTags"][value="google-apps-script"]').check();

    // 一括追加ボタンをクリック
    const submitButton = page
      .locator('button[type="submit"]')
      .filter({ hasText: '自動検索・一括追加実行' });
    await submitButton.click();

    // エラーメッセージが表示されることを確認
    await expect(page.locator('text=開始ページは終了ページ以下である必要があります')).toBeVisible({
      timeout: 5000,
    });

    console.log('✅ パラメータ検証エラーのテストが完了しました');
  });

  test('一括登録APIフォームの基本動作が正常に動作する', async ({ page }) => {
    // 管理画面にアクセス
    await page.goto('/admin/libraries');

    // ページが読み込まれるまで待機
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toContainText('ライブラリ管理');

    // 一括新規追加ボタンをクリックしてフォームを表示
    const bulkAddButton = page.locator('button:has-text("一括新規追加")');
    await expect(bulkAddButton).toBeVisible();
    await bulkAddButton.click();

    // フォームが表示されることを確認
    await expect(page.locator('input[name="startPage"]')).toBeVisible();
    await expect(page.locator('input[name="endPage"]')).toBeVisible();
    await expect(page.locator('select[name="perPage"]')).toBeVisible();
    await expect(page.locator('select[name="sortOption"]')).toBeVisible();

    // 検索条件を設定
    await page.locator('input[name="startPage"]').fill('1');
    await page.locator('input[name="endPage"]').fill('1');
    await page.locator('select[name="perPage"]').selectOption('10');
    await page.locator('input[name="selectedTags"][value="google-apps-script"]').check();

    // ボタンが有効になることを確認
    const submitButton = page
      .locator('button[type="submit"]')
      .filter({ hasText: '自動検索・一括追加実行' });
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toBeEnabled();

    console.log('✅ 一括登録フォームの基本動作テストが完了しました');
  });
});
