import * as Factory from 'factory.ts';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProductionGitHubApiClient } from '../../../../../src/lib/server/services/production-github-api-client.js';
import { createFactoryWrapper } from '../../../../factories/index.js';

// テスト用のGitHub APIレスポンスをモック
const GitHubRepositoryFactory = createFactoryWrapper(
  Factory.Sync.makeFactory({
    id: 123456789,
    name: 'test-library',
    full_name: 'testowner/test-library', // cspell:disable-line
    html_url: 'https://github.com/testowner/test-library', // cspell:disable-line
    owner: {
      login: 'testowner', // cspell:disable-line
      html_url: 'https://github.com/testowner', // cspell:disable-line
    },
    description: 'Test GAS library',
    stargazers_count: 42,
    license: {
      name: 'MIT License',
      url: 'https://api.github.com/licenses/mit',
    },
  })
);

const GitHubReadmeFactory = createFactoryWrapper(
  Factory.Sync.makeFactory({
    content: btoa('# Test Library\n\nThis is a test Google Apps Script library.'),
    encoding: 'base64' as const,
  })
);

const GitHubSearchResponseFactory = createFactoryWrapper(
  Factory.Sync.makeFactory({
    total_count: 1,
    incomplete_results: false,
    items: [GitHubRepositoryFactory.build()],
  })
);

const GitHubCommitFactory = createFactoryWrapper(
  Factory.Sync.makeFactory({
    commit: {
      committer: {
        date: '2024-01-15T10:30:00Z',
      },
    },
  })
);

// fetch関数をモック
global.fetch = vi.fn();
const mockFetch = vi.mocked(fetch);

// 環境変数をモック
vi.mock('$env/static/private', () => ({
  GITHUB_TOKEN: 'test-token',
}));

describe('ProductionGitHubApiClient', () => {
  let client: ProductionGitHubApiClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new ProductionGitHubApiClient();

    // キャッシュをクリア（静的プロパティにアクセス）
    (ProductionGitHubApiClient as unknown as { cache?: Map<string, unknown> }).cache?.clear?.();

    // 適応的待機時間をリセット
    (ProductionGitHubApiClient as unknown as { adaptiveDelay: number }).adaptiveDelay = 200;
    (ProductionGitHubApiClient as unknown as { lastRateLimitTime: number }).lastRateLimitTime = 0;
  });

  describe('createHeaders', () => {
    it('正しい認証ヘッダーを生成する', () => {
      const headers = client.createHeaders();

      expect(headers).toEqual({
        Accept: 'application/vnd.github+json',
        'User-Agent': 'app-script-hub',
        'X-GitHub-Api-Version': '2022-11-28',
        Authorization: 'token test-token',
      });
    });
  });

  describe('fetchRepositoryInfo', () => {
    it('リポジトリ情報を正常に取得できる', async () => {
      const mockRepo = GitHubRepositoryFactory.build();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockRepo),
      } as Response);

      const result = await client.fetchRepositoryInfo('testowner', 'test-library'); // cspell:disable-line

      expect(result).toEqual(mockRepo);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.github.com/repos/testowner/test-library', // cspell:disable-line
        {
          headers: expect.objectContaining({
            Authorization: 'token test-token',
          }),
        }
      );
    });

    it('API エラーの場合は例外を投げる', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as Response);

      await expect(client.fetchRepositoryInfo('testowner', 'nonexistent')).rejects.toThrow(
        // cspell:disable-line
        'GitHub API Error: 404 Not Found'
      );
    });
  });

  describe('fetchReadme', () => {
    it('README を正常に取得・デコードできる', async () => {
      const mockReadme = GitHubReadmeFactory.build();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockReadme),
      } as Response);

      const result = await client.fetchReadme('testowner', 'test-library'); // cspell:disable-line

      expect(result).toBe('# Test Library\n\nThis is a test Google Apps Script library.');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.github.com/repos/testowner/test-library/readme', // cspell:disable-line
        {
          headers: expect.objectContaining({
            Authorization: 'token test-token',
          }),
        }
      );
    });

    it('README が見つからない場合は undefined を返す', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response);

      const result = await client.fetchReadme('testowner', 'test-library'); // cspell:disable-line

      expect(result).toBeUndefined();
    });

    it('fetch エラーの場合は undefined を返す', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await client.fetchReadme('testowner', 'test-library'); // cspell:disable-line

      expect(result).toBeUndefined();
    }, 10000); // タイムアウトを10秒に設定
  });

  describe('fetchLastCommitDate', () => {
    it('最終コミット日時を正常に取得できる', async () => {
      const mockCommits = [GitHubCommitFactory.build()];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockCommits),
      } as Response);

      const result = await client.fetchLastCommitDate('testowner', 'test-library'); // cspell:disable-line

      expect(result).toEqual(new Date('2024-01-15T10:30:00Z'));
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.github.com/repos/testowner/test-library/commits?per_page=1', // cspell:disable-line
        {
          headers: expect.objectContaining({
            Authorization: 'token test-token',
          }),
        }
      );
    });

    it('コミットが見つからない場合は null を返す', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      } as Response);

      const result = await client.fetchLastCommitDate('testowner', 'test-library'); // cspell:disable-line

      expect(result).toBeNull();
    });

    it('API エラーの場合は null を返す', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response);

      const result = await client.fetchLastCommitDate('testowner', 'test-library'); // cspell:disable-line

      expect(result).toBeNull();
    });
  });

  describe('searchRepositoriesByTags', () => {
    const mockConfig = {
      gasTags: ['google-apps-script'],
      verbose: false,
      rateLimit: {},
      github: { sortBy: 'stars' as const },
    };

    it('リポジトリ検索を正常に実行できる', async () => {
      const mockSearchResponse = GitHubSearchResponseFactory.build();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSearchResponse),
      } as Response);

      const result = await client.searchRepositoriesByTags(mockConfig, 10);

      expect(result).toEqual({
        success: true,
        repositories: mockSearchResponse.items,
        totalFound: mockSearchResponse.total_count,
        processedCount: mockSearchResponse.items.length,
      });
    });

    it('複数タグでの検索クエリを正しく構築する', async () => {
      const configWithMultipleTags = {
        ...mockConfig,
        gasTags: ['google-apps-script', 'apps-script'],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(GitHubSearchResponseFactory.build()),
      } as Response);

      await client.searchRepositoriesByTags(configWithMultipleTags, 10);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(encodeURIComponent('google-apps-script OR apps-script in:topics')),
        expect.any(Object)
      );
    });

    it('有効なタグがない場合はエラーを返す', async () => {
      const configWithInvalidTags = {
        ...mockConfig,
        gasTags: ['', '   '], // 空文字とスペースのみのタグ
      };

      const result = await client.searchRepositoriesByTags(configWithInvalidTags, 10);

      // 実装では有効なタグがない場合はエラーを返す
      expect(result.success).toBe(false);
      expect(result.error).toBe('有効なGASタグが指定されていません');
    });

    it('API エラーの場合はフォールバック検索を実行する', async () => {
      // 最初の検索は422エラー - fetchWithRetryが投げるエラーをモック
      mockFetch.mockRejectedValueOnce(
        new Error('GitHub Search API Error: 422 Unprocessable Entity')
      );

      // フォールバック検索は成功
      const fallbackResponse = GitHubSearchResponseFactory.build();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(fallbackResponse),
      } as Response);

      const result = await client.searchRepositoriesByTags(mockConfig, 10);

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('searchRepositoriesByPageRange', () => {
    const mockConfig = {
      gasTags: ['google-apps-script'],
      verbose: false,
      rateLimit: {},
      github: { sortBy: 'stars' as const },
    };

    it('ページ範囲指定での検索を正常に実行できる', async () => {
      const mockSearchResponse = GitHubSearchResponseFactory.build();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSearchResponse),
      } as Response);

      const result = await client.searchRepositoriesByPageRange(mockConfig, 1, 1, 10);

      expect(result).toEqual({
        success: true,
        repositories: mockSearchResponse.items,
        totalFound: mockSearchResponse.total_count,
        processedCount: mockSearchResponse.items.length,
      });
    });

    it('複数ページの検索を正常に実行できる', async () => {
      // 各ページで成功するモック
      for (let i = 0; i < 2; i++) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(GitHubSearchResponseFactory.build()),
        } as Response);
      }

      const result = await client.searchRepositoriesByPageRange(mockConfig, 1, 2, 10);

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('パフォーマンス特性の記録', () => {
    it('API呼び出しのレスポンス時間を測定', async () => {
      const mockRepo = GitHubRepositoryFactory.build();
      mockFetch.mockImplementation(
        () =>
          new Promise(resolve => {
            setTimeout(() => {
              resolve({
                ok: true,
                json: () => Promise.resolve(mockRepo),
              } as Response);
            }, 50); // 50ms の模擬レスポンス時間
          })
      );

      const startTime = performance.now();
      await client.fetchRepositoryInfo('testowner', 'test-library'); // cspell:disable-line
      const endTime = performance.now();

      const responseTime = endTime - startTime;
      expect(responseTime).toBeGreaterThan(40); // 若干余裕を持った値
      expect(responseTime).toBeLessThan(200); // より余裕を持った上限
    });

    it('複数ページの検索でエラーハンドリングが正常に動作する', async () => {
      // 複数回のモック設定
      for (let i = 0; i < 3; i++) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(GitHubSearchResponseFactory.build()),
        } as Response);
      }

      const result = await client.searchRepositoriesByPageRange(
        {
          gasTags: ['google-apps-script'],
          verbose: false,
          rateLimit: {},
          github: { sortBy: 'stars' as const },
        },
        1,
        3,
        10
      );

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });
});
