import { expect, test } from '@playwright/test';
import { LibraryTestDataFactories } from '../factories/index.js';
import { clearTestDataBeforeTest } from './test-utils.js';

test.describe('Admin Screen - Library Registration', () => {
  test('新規ライブラリ登録から詳細ページ表示まで', async ({ page }) => {
    // テスト前にデータをクリア
    await clearTestDataBeforeTest();
    // テスト用のデータをFactoryから生成
    const testData = LibraryTestDataFactories.default.build();

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

    // ライブラリ名（概要セクションの特定の要素を選択）
    await expect(page.locator('dt:has-text("Library Name") + dd')).toBeVisible();
    await expect(page.locator('dt:has-text("Library Name") + dd')).toHaveText(testData.name);

    // GAS スクリプトID（概要セクションの特定の要素を選択）
    await expect(page.locator('dt:has-text("GAS Script ID") + dd')).toBeVisible();
    await expect(page.locator('dt:has-text("GAS Script ID") + dd')).toContainText(
      testData.scriptId
    );

    // GitHub リポジトリURLを確認（特定のセクションのみ）
    await expect(
      page.locator(`dt:has-text("GitHub Repository URL") + dd a[href="${testData.repositoryUrl}"]`)
    ).toBeVisible();

    // GitHub 作者（概要セクションの特定の要素を選択）
    await expect(page.locator('dt:has-text("GitHub Author") + dd a')).toBeVisible();
    await expect(page.locator('dt:has-text("GitHub Author") + dd a')).toHaveText(
      testData.authorName
    );

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
    await clearTestDataBeforeTest();
    // 既存のライブラリ詳細ページに直接アクセス（テスト用）
    await page.goto('/admin/libraries/new');

    // テストライブラリを作成
    const testData = LibraryTestDataFactories.default.build();
    const repoPath = testData.repositoryUrl.replace('https://github.com/', '');

    await page.fill('input[name="scriptId"]', testData.scriptId);
    await page.fill('input[name="repoUrl"]', repoPath);
    await page.click('button[type="submit"]');

    // 詳細ページへのリダイレクトを待機
    await page.waitForURL(/\/admin\/libraries\/[^/]+$/);

    // 管理者ヘッダーのライブラリ一覧リンクをクリック
    await page.click('a[href="/admin/libraries"]');

    // ライブラリ一覧ページに遷移することを確認
    await expect(page).toHaveURL('/admin/libraries');
  });

  test('重複データエラーハンドリング - 同じscriptIdでの登録', async ({ page }) => {
    await clearTestDataBeforeTest();

    const testData = LibraryTestDataFactories.default.build();

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
