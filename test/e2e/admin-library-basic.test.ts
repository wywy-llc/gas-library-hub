import { expect, test } from '@playwright/test';

test.describe('Admin Screen - Library Functions (Basic)', () => {
  test('管理者トップページのリダイレクト確認', async ({ page }) => {
    // /admin にアクセス
    await page.goto('/admin');

    // /admin/libraries にリダイレクトされることを確認
    await expect(page).toHaveURL('/admin/libraries');
  });
});
