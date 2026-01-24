import { env } from '$env/dynamic/private';
import { MockGitHubApiClient } from '$lib/server/services/mock-github-api-client.js';
import { ProductionGitHubApiClient } from '$lib/server/services/production-github-api-client.js';
import type { GitHubApiClient } from '$lib/types/github-api-client.js';
import type { GitHubRepository } from '$lib/types/github-scraper.js';

/**
 * E2Eテスト用のGitHubモックデータ
 * テスト環境で使用されるモックレスポンスを定義
 */
export class GitHubMockData {
  /**
   * OAuth2ライブラリのモックリポジトリ情報
   */
  static getOauth2LibraryRepository(): GitHubRepository {
    return {
      name: 'apps-script-oauth2',
      description: 'An OAuth2 library for Google Apps Script.',
      html_url: 'https://github.com/googleworkspace/apps-script-oauth2',
      clone_url: 'https://github.com/googleworkspace/apps-script-oauth2.git',
      stargazers_count: 1500,
      owner: {
        login: 'googleworkspace',
        html_url: 'https://github.com/googleworkspace',
      },
      license: {
        name: 'Apache License 2.0',
        url: 'https://www.apache.org/licenses/LICENSE-2.0',
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  /**
   * デフォルトのモックリポジトリ情報
   */
  static getDefaultRepository(owner: string, repo: string): GitHubRepository {
    return {
      name: repo,
      description: `Mock description for ${repo}`,
      html_url: `https://github.com/${owner}/${repo}`,
      clone_url: `https://github.com/${owner}/${repo}.git`,
      stargazers_count: 42,
      owner: {
        login: owner,
        html_url: `https://github.com/${owner}`,
      },
      license: {
        name: 'MIT License',
        url: 'https://opensource.org/licenses/MIT',
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  /**
   * OAuth2ライブラリのモックREADME
   */
  static getOauth2LibraryReadme(): string {
    return `# Google Apps Script OAuth2 Library

This library provides OAuth2 authentication for Google Apps Script.

## Installation

Add the library to your script:
1. Go to Libraries in your Apps Script project
2. Add the following script ID: 1B7FSrTXhS9L-WnAa8_ZdHiM-JWD4dBZ1KBFRkJx0L

## Usage

\`\`\`javascript
function authenticate() {
  const oauth = new OAuth2({
    clientId: 'your-client-id',
    clientSecret: 'your-client-secret',
    redirectUri: 'your-redirect-uri'
  });

  const authUrl = oauth.getAuthorizationUrl();
  console.log('Visit this URL:', authUrl);
}
\`\`\`

## Features

- Easy OAuth2 implementation
- Secure token management
- Automatic token refresh`;
  }

  /**
   * デフォルトのモックREADME
   */
  static getDefaultReadme(repo: string): string {
    return `# ${repo}

Mock README for E2E testing.

## Installation

This is a mock library for testing purposes.

## Usage

\`\`\`javascript
// Mock usage example
const lib = new MockLibrary();
lib.doSomething();
\`\`\``;
  }

  /**
   * モックコミット日時を取得（3日前）
   */
  static getMockCommitDate(): Date {
    const mockCommitDate = new Date();
    mockCommitDate.setDate(mockCommitDate.getDate() - 3);
    return mockCommitDate;
  }
}

/**
 * GitHub API クライアントを作成するヘルパー関数
 */
const createGitHubApiClient = (): GitHubApiClient => {
  // E2Eテストモードの判定
  // ユニットテストでは実際のAPIを呼び出すため、Playwrightによる実際のE2Eテストのみモックを適用
  const isE2eTestMode =
    (env.PLAYWRIGHT_TEST_MODE === 'true' || process.env.PLAYWRIGHT_TEST_MODE === 'true') &&
    process.env.VITEST !== 'true';

  if (isE2eTestMode) {
    return new MockGitHubApiClient();
  }

  return new ProductionGitHubApiClient();
};

/**
 * GitHubApiClientFactoryのラッパー
 * 環境に応じた適切なクライアントを返す
 */
export const GitHubApiClientFactory = {
  build: (): GitHubApiClient => createGitHubApiClient(),
};
