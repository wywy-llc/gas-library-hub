import { expect, test } from '@playwright/test';
import { clearTestDataBeforeTest } from './test-utils.js';

test.describe('Admin Screen - Library Search Functionality', () => {
  // テストグループ全体で一度だけクリーンアップ
  test.beforeAll(async () => {
    await clearTestDataBeforeTest();
  });

  test.beforeEach(async ({ page }) => {
    // 管理画面にアクセス
    await page.goto('/admin/libraries');
  });

  test('スクリプトタイプフィルターから検索キーワード追加の再検索動作', async ({ page }) => {
    // 1. まずスクリプトタイプ「ライブラリ」でフィルタリング
    await page.selectOption('select[name="scriptType"]', 'library');

    // URLが正しく更新されていることを確認
    await expect(page).toHaveURL(/scriptType=library/);

    // ページパラメータがないことを確認（1ページ目）
    await expect(page).not.toHaveURL(/page=/);

    // 2. 検索キーワード「db」を入力して再検索
    const searchInput = page.locator('input[type="text"][name="search"]');
    await searchInput.fill('db');
    await page.click('button[aria-label="検索実行"]');

    // URLが正しく更新されていることを確認（両方の条件が含まれる）
    await expect(page).toHaveURL(/scriptType=library/);
    await expect(page).toHaveURL(/search=db/);

    // ページパラメータがリセットされていることを確認
    await expect(page).not.toHaveURL(/page=/);

    // 検索結果の表示を確認
    await expect(page.locator('text=検索中: "db"')).toBeVisible();
    await expect(page.locator('text=タイプ: ライブラリ')).toBeVisible();

    // 検索フォームの値が保持されていることを確認
    await expect(searchInput).toHaveValue('db');
    await expect(page.locator('select[name="scriptType"]')).toHaveValue('library');
  });

  test('検索キーワードを変更した際の再検索動作', async ({ page }) => {
    const searchInput = page.locator('input[type="text"][name="search"]');

    // 1. 最初の検索キーワード「test」で検索
    await searchInput.fill('test');
    await page.click('button[aria-label="検索実行"]');

    // URLと表示を確認
    await expect(page).toHaveURL(/search=test/);
    await expect(page.locator('text=検索中: "test"')).toBeVisible();

    // 2. 検索キーワードを「db」に変更して再検索
    await searchInput.fill('db');
    await page.click('button[aria-label="検索実行"]');

    // URLが正しく更新されていることを確認
    await expect(page).toHaveURL(/search=db/);
    await expect(page).not.toHaveURL(/search=test/);

    // ページパラメータがリセットされていることを確認
    await expect(page).not.toHaveURL(/page=/);

    // 新しい検索結果の表示を確認
    await expect(page.locator('text=検索中: "db"')).toBeVisible();
    await expect(page.locator('text=検索中: "test"')).not.toBeVisible();

    // 検索フォームの値が新しい値に更新されていることを確認
    await expect(searchInput).toHaveValue('db');
  });

  test('スクリプトタイプを変更した際のページネーションリセット', async ({ page }) => {
    const searchInput = page.locator('input[type="text"][name="search"]');

    // 1. 検索キーワードを設定
    await searchInput.fill('lib');
    await page.click('button[aria-label="検索実行"]');

    // URLを確認
    await expect(page).toHaveURL(/search=lib/);

    // 2. スクリプトタイプを「ライブラリ」に変更
    await page.selectOption('select[name="scriptType"]', 'library');

    // URLが正しく更新されていることを確認
    await expect(page).toHaveURL(/search=lib/);
    await expect(page).toHaveURL(/scriptType=library/);

    // ページパラメータがリセットされていることを確認
    await expect(page).not.toHaveURL(/page=/);

    // 3. スクリプトタイプを「Webアプリ」に変更
    await page.selectOption('select[name="scriptType"]', 'web_app');

    // URLが正しく更新されていることを確認
    await expect(page).toHaveURL(/search=lib/);
    await expect(page).toHaveURL(/scriptType=web_app/);
    await expect(page).not.toHaveURL(/scriptType=library/);

    // ページパラメータがリセットされていることを確認
    await expect(page).not.toHaveURL(/page=/);
  });

  test('検索条件のクリア機能', async ({ page }) => {
    const searchInput = page.locator('input[type="text"][name="search"]');

    // 1. スクリプトタイプを先に設定
    await page.selectOption('select[name="scriptType"]', 'library');
    await expect(page).toHaveURL(/scriptType=library/);

    // 2. 検索キーワードを追加
    await searchInput.fill('test');
    await page.click('button[aria-label="検索実行"]');

    // 検索条件が適用されていることを確認
    await expect(page).toHaveURL(/search=test/);
    await expect(page).toHaveURL(/scriptType=library/);
    await expect(page.locator('text=検索中: "test"')).toBeVisible();
    await expect(page.locator('text=タイプ: ライブラリ')).toBeVisible();

    // 3. クリアリンクをクリック
    await page.click('a:has-text("クリア")');

    // 全ての検索条件がクリアされていることを確認
    await expect(page).toHaveURL('/admin/libraries');
    await expect(page).not.toHaveURL(/search=/);
    await expect(page).not.toHaveURL(/scriptType=/);

    // 検索条件の表示が消えていることを確認
    await expect(page.locator('text=検索中:')).not.toBeVisible();
    await expect(page.locator('text=タイプ: ライブラリ')).not.toBeVisible();

    // フォームがリセットされていることを確認
    await expect(searchInput).toHaveValue('');
    await expect(page.locator('select[name="scriptType"]')).toHaveValue('');
  });

  test('空の検索キーワードでの検索処理', async ({ page }) => {
    const searchInput = page.locator('input[type="text"][name="search"]');

    // 1. 最初に何らかの検索キーワードを設定
    await searchInput.fill('test');
    await page.click('button[aria-label="検索実行"]');

    await expect(page).toHaveURL(/search=test/);

    // 2. 検索キーワードを空にして再検索
    await searchInput.fill('');
    await page.click('button[aria-label="検索実行"]');

    // 検索パラメータが削除されていることを確認
    await expect(page).not.toHaveURL(/search=/);

    // 検索条件の表示が消えていることを確認
    await expect(page.locator('text=検索中:')).not.toBeVisible();
  });

  test('検索結果件数の表示確認', async ({ page }) => {
    const searchInput = page.locator('input[type="text"][name="search"]');

    // 1. 全件表示時の件数確認
    await expect(page.locator('text=/全 \\d+件のライブラリ/')).toBeVisible();

    // 2. 検索実行後の件数確認
    await searchInput.fill('oauth');
    await page.click('button[aria-label="検索実行"]');

    // 検索結果件数の表示を確認
    await expect(page.locator('text=/検索結果: \\d+件のライブラリが見つかりました/')).toBeVisible();
  });
});
