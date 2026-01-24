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

    // ステータス（未公開）（ヘッダー部分のみ）
    await expect(
      page.locator('h1:has-text("Library Details") + div span.bg-gray-100:has-text("未公開")')
    ).toBeVisible();

    // 管理者向けボタンの存在確認
    await expect(page.locator('button:has-text("Execute Scraping")')).toBeVisible();
    await expect(page.locator('button:has-text("Edit")')).toBeVisible();
    await expect(page.locator('button.bg-green-600:has-text("Publish")')).toBeVisible();

    // 7. ライブラリ詳細情報が正常に表示されているか確認（GitHubから取得されたかの確認）
    await expect(page.locator('h2:has-text("Overview")')).toBeVisible();
  });

  test('フォームバリデーション - 必須項目未入力', async ({ page }) => {
    await clearTestDataBeforeTest();
    // 新規ライブラリ追加ページにアクセス
    await page.goto('/admin/libraries/new');

    // HTML5バリデーションを無効にする
    await page.evaluate(() => {
      const form = document.querySelector('form');
      if (form) {
        form.setAttribute('novalidate', '');
      }
    });

    // 空の状態で送信
    await page.click('button[type="submit"]');

    // バリデーションエラーメッセージの確認
    await expect(page.locator('text=Please enter the GAS Script ID')).toBeVisible();
  });

  test('フォームバリデーション - GitHub URL形式エラー', async ({ page }) => {
    await clearTestDataBeforeTest();
    // 新規ライブラリ追加ページにアクセス
    await page.goto('/admin/libraries/new');

    // HTML5バリデーションを無効にする
    await page.evaluate(() => {
      const form = document.querySelector('form');
      if (form) {
        form.setAttribute('novalidate', '');
      }
    });

    // 無効な形式のGitHub URLを入力
    await page.fill('input[name="scriptId"]', 'TEST_SCRIPT_ID');
    await page.fill('input[name="repoUrl"]', 'invalid-url-format');

    // フォーム送信
    await page.click('button[type="submit"]');

    // バリデーションエラーメッセージの確認
    await expect(page.locator('text=The GitHub repository URL format is incorrect')).toBeVisible();
  });

  test('存在しないGitHubリポジトリのエラーハンドリング', async ({ page }) => {
    await clearTestDataBeforeTest();
    const testData = LibraryTestDataFactories.default.build({
      scriptId: 'TEST_SCRIPT_ID',
      repositoryUrl: 'https://github.com/nonexistent-user-999999/nonexistent-repo-999999',
    });
    const repoPath = testData.repositoryUrl.replace('https://github.com/', '');

    // 新規ライブラリ追加ページにアクセス
    await page.goto('/admin/libraries/new');

    // 存在しないリポジトリを入力
    await page.fill('input[name="scriptId"]', testData.scriptId);
    await page.fill('input[name="repoUrl"]', repoPath);

    // フォーム送信
    await page.click('button[type="submit"]');

    // エラーメッセージの確認（実際のサービスから返されるメッセージと一致）
    await expect(page.locator('text=The specified GitHub repository was not found.')).toBeVisible();
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
    const repoPath = testData.repositoryUrl.replace('https://github.com/', '');
    await page.fill('input[name="scriptId"]', testData.scriptId);
    await page.fill('input[name="repoUrl"]', repoPath);
    await page.click('button[type="submit"]');

    // 結果を待機（成功メッセージまたは詳細ページへのリダイレクト）
    await Promise.race([
      page.waitForURL(/\/admin\/libraries\/[^/]+$/),
      page.locator('text=Library has been successfully registered').waitFor(),
    ]);

    // 2回目の登録（重複エラーを発生させる）
    await page.goto('/admin/libraries/new');
    await page.fill('input[name="scriptId"]', testData.scriptId);
    await page.fill('input[name="repoUrl"]', testData.repositoryUrl);
    await page.click('button[type="submit"]');

    // 重複エラーメッセージの表示を待機（bg-red-50のアラートボックスを確認）
    await expect(page.locator('.bg-red-50, div:has-text("既に登録")').first()).toBeVisible({
      timeout: 10000,
    });
  });

  test('重複データエラーハンドリング - 同じrepositoryUrlでの登録', async ({ page }) => {
    await clearTestDataBeforeTest();

    const testData = LibraryTestDataFactories.default.build();
    const repoPath = testData.repositoryUrl.replace('https://github.com/', '');

    // 1回目の登録（成功）
    await page.goto('/admin/libraries/new');
    await page.fill('input[name="scriptId"]', testData.scriptId);
    await page.fill('input[name="repoUrl"]', repoPath);
    await page.click('button[type="submit"]');

    // 成功メッセージの確認 OR 詳細ページへのリダイレクト確認
    try {
      await expect(
        page.locator(
          'text=Library has been successfully registered. Redirecting to the details page...'
        )
      ).toBeVisible({
        timeout: 10000,
      });
    } catch {
      // リダイレクトされた場合は成功とみなす
      await page.waitForURL(/\/admin\/libraries\/[^/]+$/, { timeout: 5000 });
    }

    // 2回目の登録（同じrepositoryUrlで失敗）
    await page.goto('/admin/libraries/new');
    await page.fill('input[name="scriptId"]', 'DIFFERENT_SCRIPT_ID_' + Date.now());
    await page.fill('input[name="repoUrl"]', repoPath);
    await page.click('button[type="submit"]');

    // repositoryUrl重複エラーメッセージの確認
    await expect(page.locator('text=This repository is already registered.')).toBeVisible();
  });
});
