import { expect, test } from '@playwright/test';
import { LibraryTestDataFactories } from '../factories/index.js';

// 並列実行のため、各テストでユニークなスコープを使用
const TEST_SCOPE = `REG_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

test.describe('Admin Screen - Library Registration', () => {
  test('新規ライブラリ登録から詳細ページ表示まで', async ({ page }) => {
    // テスト用のデータをFactoryから生成（ユニークなスコープ付き）
    const timestamp = Date.now();
    const testData = LibraryTestDataFactories.default.build({
      scriptId: `${TEST_SCOPE}_NEW_${timestamp}`,
      repositoryUrl: `https://github.com/test/${TEST_SCOPE}-new-${timestamp}`,
    });

    // 1. 新規ライブラリ追加ページにアクセス
    await page.goto('/admin/libraries/new');

    // ページタイトルの確認
    await expect(page).toHaveTitle(/Add New Library/);

    // 2. フォームに入力
    // repositoryUrlからowner/repo形式を抽出
    const repoPath = testData.repositoryUrl.replace('https://github.com/', '');
    await page.fill('input[name="scriptId"]', testData.scriptId);
    await page.fill('input[name="repoUrl"]', repoPath);

    // 3. フォーム送信
    await page.click('button[type="submit"]');

    // 4. 成功メッセージの確認（詳細ページ移動の告知メッセージ）
    await expect(
      page.locator(
        'text=Library has been successfully registered. Redirecting to the details page...'
      )
    ).toBeVisible();

    // 5. 詳細ページへのリダイレクトを待機
    await page.waitForURL(/\/admin\/libraries\/[^/]+$/);

    // 6. 詳細ページの内容確認
    // ページタイトル
    await expect(page).toHaveTitle(/Library Details/);

    // ライブラリ名が表示されていることを確認
    await expect(page.locator('dt:has-text("Library Name") + dd')).toBeVisible();

    // GAS スクリプトIDが表示されていることを確認
    await expect(page.locator('dt:has-text("GAS Script ID") + dd')).toBeVisible();
    await expect(page.locator('dt:has-text("GAS Script ID") + dd')).toContainText(
      testData.scriptId.substring(0, 20)
    );

    // GitHub リポジトリURLが表示されていることを確認
    await expect(page.locator('dt:has-text("GitHub Repository URL") + dd')).toBeVisible();

    // GitHub 作者が表示されていることを確認
    await expect(page.locator('dt:has-text("GitHub Author") + dd')).toBeVisible();

    // ステータス（未公開）
    await expect(page.locator('span:has-text("未公開")')).toBeVisible();

    // 管理者向けボタンの存在確認
    await expect(page.locator('button:has-text("Execute Scraping")')).toBeVisible();
    await expect(page.locator('button:has-text("Edit")')).toBeVisible();
    await expect(page.locator('button:has-text("Publish")')).toBeVisible();

    // 7. ライブラリ詳細情報が正常に表示されているか確認（GitHubから取得されたかの確認）
    await expect(page.locator('h2:has-text("Overview")')).toBeVisible();
  });

  test('詳細ページから管理者ライブラリ一覧への戻り', async ({ page }) => {
    // 新規ライブラリ追加ページにアクセス
    await page.goto('/admin/libraries/new');

    // テストライブラリを作成（ユニークなスコープ付き）
    const timestamp = Date.now();
    const testData = LibraryTestDataFactories.default.build({
      scriptId: `${TEST_SCOPE}_BACK_${timestamp}`,
      repositoryUrl: `https://github.com/test/${TEST_SCOPE}-back-${timestamp}`,
    });
    const repoPath = testData.repositoryUrl.replace('https://github.com/', '');

    await page.fill('input[name="scriptId"]', testData.scriptId);
    await page.fill('input[name="repoUrl"]', repoPath);
    await page.click('button[type="submit"]');

    // 詳細ページへのリダイレクトを待機
    await page.waitForURL(/\/admin\/libraries\/[^/]+$/);

    // ページが完全にロードされるまで待機
    await page.waitForLoadState('networkidle');

    // 管理者ヘッダーのライブラリ一覧リンクをクリック
    const libraryListLink = page.locator('header a[href="/admin/libraries"]');
    await libraryListLink.waitFor({ state: 'visible' });
    await libraryListLink.click();

    // ライブラリ一覧ページに遷移することを確認
    await expect(page).toHaveURL('/admin/libraries');
  });

  test('重複データエラーハンドリング - 同じscriptIdでの登録', async ({ page }) => {
    const timestamp = Date.now();
    const testData = LibraryTestDataFactories.default.build({
      scriptId: `${TEST_SCOPE}_DUP_${timestamp}`,
      repositoryUrl: `https://github.com/test/${TEST_SCOPE}-dup-${timestamp}`,
    });

    // 1回目の登録
    await page.goto('/admin/libraries/new');
    await page.waitForLoadState('networkidle');

    const repoPath = testData.repositoryUrl.replace('https://github.com/', '');
    await page.fill('input[name="scriptId"]', testData.scriptId);
    await page.fill('input[name="repoUrl"]', repoPath);
    await page.click('button[type="submit"]');

    // 結果を待機（成功メッセージまたは詳細ページへのリダイレクト）
    await Promise.race([
      page.waitForURL(/\/admin\/libraries\/[^/]+$/, { timeout: 15000 }),
      page.locator('text=Library has been successfully registered').waitFor({ timeout: 15000 }),
    ]);

    // 2回目の登録（重複エラーを発生させる）
    await page.goto('/admin/libraries/new');
    await page.waitForLoadState('networkidle');

    await page.fill('input[name="scriptId"]', testData.scriptId);
    await page.fill('input[name="repoUrl"]', testData.repositoryUrl);
    await page.click('button[type="submit"]');

    // 重複エラーメッセージの表示を待機（bg-red-50のアラートボックスを確認）
    await expect(page.locator('.bg-red-50')).toBeVisible({
      timeout: 15000,
    });
  });
});
