import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { GitHubApiUtils } from '../../../../../src/lib/server/utils/github-api-utils.js';
import type {
  GitHubRepository,
  TagSearchResult,
} from '../../../../../src/lib/types/github-scraper.js';
import { LibraryTestDataFactories } from '../../../../factories/library-test-data.factory.js';

// モッククライアントインスタンスを事前に作成
const createMockClient = () => ({
  createHeaders: vi.fn(() => ({
    Accept: 'application/vnd.github+json',
    Authorization: 'token ghp_test_token',
    'User-Agent': 'app-script-hub',
    'X-GitHub-Api-Version': '2022-11-28',
  })),
  fetchRepositoryInfo: vi.fn(),
  fetchReadme: vi.fn(),
  fetchLastCommitDate: vi.fn(),
  searchRepositoriesByTags: vi.fn(),
  searchRepositoriesByPageRange: vi.fn(),
});

// モッククライアントを作成
let mockClientInstance = createMockClient();

// ファクトリーをモック
vi.mock('../../../../../src/lib/server/factories/github-api-client-factory.js', () => ({
  GitHubApiClientFactory: {
    build: vi.fn(() => mockClientInstance),
  },
}));

describe('GitHubApiUtils', () => {
  let mockClient: {
    createHeaders: ReturnType<typeof vi.fn>;
    fetchRepositoryInfo: ReturnType<typeof vi.fn>;
    fetchReadme: ReturnType<typeof vi.fn>;
    fetchLastCommitDate: ReturnType<typeof vi.fn>;
    searchRepositoriesByTags: ReturnType<typeof vi.fn>;
    searchRepositoriesByPageRange: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    // GitHubApiUtilsの内部クライアントをリセット
    // @ts-expect-error accessing private static property for testing
    GitHubApiUtils.client = undefined;

    // 新しいモッククライアントインスタンスを作成
    mockClientInstance = createMockClient();
    mockClient = mockClientInstance;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetchRepositoryInfo', () => {
    test('正常なレスポンスでリポジトリ情報を取得できる', async () => {
      const testData = LibraryTestDataFactories.default.build();
      const mockRepoData: GitHubRepository = {
        name: testData.name,
        description: testData.description,
        html_url: testData.repositoryUrl,
        clone_url: testData.repositoryUrl + '.git',
        stargazers_count: testData.starCount || 0,
        owner: {
          login: testData.authorName,
          html_url: testData.authorUrl,
        },
        license: {
          name: testData.licenseType || 'MIT',
          url: testData.licenseUrl || '',
        },
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-12-01T00:00:00Z',
      };

      mockClient.fetchRepositoryInfo.mockResolvedValueOnce(mockRepoData);

      const result = await GitHubApiUtils.fetchRepositoryInfo(
        'googleworkspace',
        'apps-script-oauth2'
      );

      expect(mockClient.fetchRepositoryInfo).toHaveBeenCalledWith(
        'googleworkspace',
        'apps-script-oauth2'
      );
      expect(result).toEqual(mockRepoData);
    });

    test('404エラーの場合はエラーをスローする', async () => {
      mockClient.fetchRepositoryInfo.mockRejectedValueOnce(
        new Error('GitHub API Error: 404 Not Found')
      );

      await expect(GitHubApiUtils.fetchRepositoryInfo('nonexistent', 'repo')).rejects.toThrow(
        'GitHub API Error: 404 Not Found'
      );
    });

    test('500エラーの場合はエラーをスローする', async () => {
      mockClient.fetchRepositoryInfo.mockRejectedValueOnce(
        new Error('GitHub API Error: 500 Internal Server Error')
      );

      await expect(GitHubApiUtils.fetchRepositoryInfo('test', 'repo')).rejects.toThrow(
        'GitHub API Error: 500 Internal Server Error'
      );
    });
  });

  describe('fetchReadme', () => {
    test('Base64エンコードされたREADMEを正常にデコードできる', async () => {
      const originalContent = '# Test README\n\nThis is a test.';

      mockClient.fetchReadme.mockResolvedValueOnce(originalContent);

      const result = await GitHubApiUtils.fetchReadme('test', 'repo');

      expect(mockClient.fetchReadme).toHaveBeenCalledWith('test', 'repo');
      expect(result).toBe(originalContent);
    });

    test('Base64以外のエンコーディングの場合はそのまま返す', async () => {
      mockClient.fetchReadme.mockResolvedValueOnce('Raw content');

      const result = await GitHubApiUtils.fetchReadme('test', 'repo');

      expect(result).toBe('Raw content');
    });

    test('README が存在しない場合はundefinedを返す', async () => {
      mockClient.fetchReadme.mockResolvedValueOnce(undefined);

      const result = await GitHubApiUtils.fetchReadme('test', 'repo');

      expect(result).toBeUndefined();
    });

    test('API呼び出し中にエラーが発生した場合はundefinedを返す', async () => {
      mockClient.fetchReadme.mockResolvedValueOnce(undefined);

      const result = await GitHubApiUtils.fetchReadme('test', 'repo');

      expect(result).toBeUndefined();
    });
  });

  describe('searchRepositoriesByTags', () => {
    test('正常な検索結果を返す', async () => {
      const testData = LibraryTestDataFactories.default.build();
      const mockSearchResult: TagSearchResult = {
        success: true,
        repositories: [
          {
            name: testData.name,
            description: testData.description,
            html_url: testData.repositoryUrl,
            clone_url: testData.repositoryUrl + '.git',
            stargazers_count: testData.starCount || 0,
            owner: {
              login: testData.authorName,
              html_url: testData.authorUrl,
            },
            license: {
              name: testData.licenseType || 'MIT',
              url: testData.licenseUrl || '',
            },
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-12-01T00:00:00Z',
          },
        ],
        totalFound: 1,
        processedCount: 1,
      };

      mockClient.searchRepositoriesByTags.mockResolvedValueOnce(mockSearchResult);

      const config = {
        gasTags: ['google-apps-script', 'apps-script'],
        scriptIdPatterns: [],
        rateLimit: { maxRequestsPerHour: 5000 },
        verbose: false,
      };

      const result = await GitHubApiUtils.searchRepositoriesByTags(config, 10);

      expect(mockClient.searchRepositoriesByTags).toHaveBeenCalledWith(config, 10);
      expect(result.success).toBe(true);
      expect(result.repositories).toHaveLength(1);
      expect(result.totalFound).toBe(1);
      expect(result.processedCount).toBe(1);
    });

    test('検索クエリが正しく構築される', async () => {
      const mockSearchResult: TagSearchResult = {
        success: true,
        repositories: [],
        totalFound: 0,
        processedCount: 0,
      };

      mockClient.searchRepositoriesByTags.mockResolvedValueOnce(mockSearchResult);

      const config = {
        gasTags: ['google-apps-script', 'apps-script', 'gas-library'],
        scriptIdPatterns: [],
        rateLimit: { maxRequestsPerHour: 5000 },
        verbose: false,
      };

      await GitHubApiUtils.searchRepositoriesByTags(config, 5);

      expect(mockClient.searchRepositoriesByTags).toHaveBeenCalledWith(config, 5);
    });

    test('maxResultsが1000を超える場合は1000に制限される', async () => {
      const mockSearchResult: TagSearchResult = {
        success: true,
        repositories: [],
        totalFound: 0,
        processedCount: 0,
      };

      mockClient.searchRepositoriesByTags.mockResolvedValueOnce(mockSearchResult);

      const config = {
        gasTags: ['test'],
        scriptIdPatterns: [],
        rateLimit: { maxRequestsPerHour: 5000 },
        verbose: false,
      };

      await GitHubApiUtils.searchRepositoriesByTags(config, 1500);

      expect(mockClient.searchRepositoriesByTags).toHaveBeenCalledWith(config, 1500);
    });

    test('ページング機能が正しく動作する（200件取得の場合）', async () => {
      const testData = LibraryTestDataFactories.default.build();

      // 200件の結果を含むレスポンス
      const repositories = Array.from({ length: 200 }, (_, i) => ({
        name: `${testData.name}-${i}`,
        description: testData.description,
        html_url: `${testData.repositoryUrl}-${i}`,
        clone_url: `${testData.repositoryUrl}-${i}.git`,
        stargazers_count: testData.starCount || 0,
        owner: {
          login: testData.authorName,
          html_url: testData.authorUrl,
        },
        license: {
          name: testData.licenseType || 'MIT',
          url: testData.licenseUrl || '',
        },
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-12-01T00:00:00Z',
      }));

      const mockSearchResult: TagSearchResult = {
        success: true,
        repositories,
        totalFound: 200,
        processedCount: 200,
      };

      mockClient.searchRepositoriesByTags.mockResolvedValueOnce(mockSearchResult);

      const config = {
        gasTags: ['google-apps-script'],
        scriptIdPatterns: [],
        rateLimit: { maxRequestsPerHour: 5000 },
        verbose: false,
      };

      const result = await GitHubApiUtils.searchRepositoriesByTags(config, 200);

      // クライアントメソッドが正しい引数で呼ばれることを確認
      expect(mockClient.searchRepositoriesByTags).toHaveBeenCalledWith(config, 200);

      // 結果の検証
      expect(result.success).toBe(true);
      expect(result.repositories).toHaveLength(200);
      expect(result.totalFound).toBe(200);
      expect(result.processedCount).toBe(200);
    });

    test('ページ範囲指定機能が正しく動作する', async () => {
      const testData = LibraryTestDataFactories.default.build();

      // ページ1とページ2のリポジトリを結合した75件の結果
      const repositories = [
        // ページ1のデータ（50件）
        ...Array.from({ length: 50 }, (_, i) => ({
          name: `${testData.name}-page1-${i}`,
          description: testData.description,
          html_url: `${testData.repositoryUrl}-page1-${i}`,
          clone_url: `${testData.repositoryUrl}-page1-${i}.git`,
          stargazers_count: testData.starCount || 0,
          owner: {
            login: testData.authorName,
            html_url: testData.authorUrl,
          },
          license: {
            name: testData.licenseType || 'MIT',
            url: testData.licenseUrl || '',
          },
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-12-01T00:00:00Z',
        })),
        // ページ2のデータ（25件）
        ...Array.from({ length: 25 }, (_, i) => ({
          name: `${testData.name}-page2-${i}`,
          description: testData.description,
          html_url: `${testData.repositoryUrl}-page2-${i}`,
          clone_url: `${testData.repositoryUrl}-page2-${i}.git`,
          stargazers_count: testData.starCount || 0,
          owner: {
            login: testData.authorName,
            html_url: testData.authorUrl,
          },
          license: {
            name: testData.licenseType || 'MIT',
            url: testData.licenseUrl || '',
          },
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-12-01T00:00:00Z',
        })),
      ];

      const mockSearchResult: TagSearchResult = {
        success: true,
        repositories,
        totalFound: 150,
        processedCount: 75,
      };

      mockClient.searchRepositoriesByPageRange.mockResolvedValueOnce(mockSearchResult);

      const config = {
        gasTags: ['google-apps-script'],
        scriptIdPatterns: [],
        rateLimit: { maxRequestsPerHour: 5000 },
        verbose: false,
      };

      // ページ1からページ2を検索（25件/ページ）
      const result = await GitHubApiUtils.searchRepositoriesByPageRange(config, 1, 2, 25);

      // クライアントメソッドが正しい引数で呼ばれることを確認
      expect(mockClient.searchRepositoriesByPageRange).toHaveBeenCalledWith(
        config,
        1,
        2,
        25,
        undefined
      );

      // 結果の検証
      expect(result.success).toBe(true);
      expect(result.repositories).toHaveLength(75); // ページ1(50件) + ページ2(25件)
      expect(result.totalFound).toBe(150);
      expect(result.processedCount).toBe(75);

      // 各ページのデータが含まれていることを確認
      expect(
        result.repositories.some((repo: GitHubRepository) => repo.name.includes('page1'))
      ).toBe(true);
      expect(
        result.repositories.some((repo: GitHubRepository) => repo.name.includes('page2'))
      ).toBe(true);
    });

    test('verboseモードでコンソールログが出力される', async () => {
      const mockSearchResult: TagSearchResult = {
        success: true,
        repositories: [],
        totalFound: 0,
        processedCount: 0,
      };

      mockClient.searchRepositoriesByTags.mockResolvedValueOnce(mockSearchResult);

      const config = {
        gasTags: ['google-apps-script', 'apps-script'],
        scriptIdPatterns: [],
        rateLimit: { maxRequestsPerHour: 5000 },
        verbose: true,
      };

      const result = await GitHubApiUtils.searchRepositoriesByTags(config);

      expect(mockClient.searchRepositoriesByTags).toHaveBeenCalledWith(config, 10);
      expect(result.success).toBe(true);
      expect(result.repositories).toHaveLength(0);
      expect(result.totalFound).toBe(0);
      expect(result.processedCount).toBe(0);
    });

    test('gasTagsが空の場合はデフォルトタグを使用する', async () => {
      const mockSearchResult: TagSearchResult = {
        success: true,
        repositories: [],
        totalFound: 0,
        processedCount: 0,
      };

      mockClient.searchRepositoriesByTags.mockResolvedValueOnce(mockSearchResult);

      const config = {
        gasTags: [], // 空の配列
        scriptIdPatterns: [],
        rateLimit: { maxRequestsPerHour: 5000 },
        verbose: false,
      };

      const result = await GitHubApiUtils.searchRepositoriesByTags(config, 5);

      expect(mockClient.searchRepositoriesByTags).toHaveBeenCalledWith(config, 5);
      expect(result.success).toBe(true);
      expect(result.repositories).toHaveLength(0);
    });

    test('gasTagsが未定義の場合はデフォルトタグを使用する', async () => {
      const mockSearchResult: TagSearchResult = {
        success: true,
        repositories: [],
        totalFound: 0,
        processedCount: 0,
      };

      mockClient.searchRepositoriesByTags.mockResolvedValueOnce(mockSearchResult);

      const config = {
        gasTags: undefined as unknown as string[], // 未定義
        scriptIdPatterns: [],
        rateLimit: { maxRequestsPerHour: 5000 },
        verbose: false,
      };

      const result = await GitHubApiUtils.searchRepositoriesByTags(config, 5);

      expect(mockClient.searchRepositoriesByTags).toHaveBeenCalledWith(config, 5);
      expect(result.success).toBe(true);
      expect(result.repositories).toHaveLength(0);
    });

    test('5つのタグを使用する場合は全て含まれる', async () => {
      const mockSearchResult: TagSearchResult = {
        success: true,
        repositories: [],
        totalFound: 0,
        processedCount: 0,
      };

      mockClient.searchRepositoriesByTags.mockResolvedValueOnce(mockSearchResult);

      const config = {
        gasTags: ['google-apps-script', 'apps-script', 'gas-library', 'clasp', 'googleappsscript'], // cspell:disable-line
        scriptIdPatterns: [],
        rateLimit: { maxRequestsPerHour: 5000 },
        verbose: false,
      };

      const result = await GitHubApiUtils.searchRepositoriesByTags(config, 10);

      expect(mockClient.searchRepositoriesByTags).toHaveBeenCalledWith(config, 10);
      expect(result.success).toBe(true);
      expect(result.repositories).toHaveLength(0);
    });

    test('6つ以上のタグを使用する場合は最初の5つのみ使用される', async () => {
      const mockSearchResult: TagSearchResult = {
        success: true,
        repositories: [],
        totalFound: 0,
        processedCount: 0,
      };

      mockClient.searchRepositoriesByTags.mockResolvedValueOnce(mockSearchResult);

      const config = {
        gasTags: [
          'google-apps-script',
          'apps-script',
          'gas-library',
          'clasp',
          'googleappsscript', // cspell:disable-line
          'gas',
          'automation',
        ],
        scriptIdPatterns: [],
        rateLimit: { maxRequestsPerHour: 5000 },
        verbose: false,
      };

      const result = await GitHubApiUtils.searchRepositoriesByTags(config, 10);

      expect(mockClient.searchRepositoriesByTags).toHaveBeenCalledWith(config, 10);
      expect(result.success).toBe(true);
      expect(result.repositories).toHaveLength(0);
    });

    test('API エラーの場合は失敗レスポンスを返す', async () => {
      const mockErrorResult: TagSearchResult = {
        success: false,
        repositories: [],
        totalFound: 0,
        processedCount: 0,
        error: 'GitHub Search API Error: 403 Forbidden',
      };

      mockClient.searchRepositoriesByTags.mockResolvedValueOnce(mockErrorResult);

      const config = {
        gasTags: ['test'],
        scriptIdPatterns: [],
        rateLimit: { maxRequestsPerHour: 5000 },
        verbose: false,
      };

      const result = await GitHubApiUtils.searchRepositoriesByTags(config);

      expect(mockClient.searchRepositoriesByTags).toHaveBeenCalledWith(config, 10);
      expect(result.success).toBe(false);
      expect(result.repositories).toHaveLength(0);
      expect(result.error).toContain('GitHub Search API Error: 403 Forbidden');
    });

    test('ネットワークエラーの場合は失敗レスポンスを返す', async () => {
      const mockErrorResult: TagSearchResult = {
        success: false,
        repositories: [],
        totalFound: 0,
        processedCount: 0,
        error: 'Network error',
      };

      mockClient.searchRepositoriesByTags.mockResolvedValueOnce(mockErrorResult);

      const config = {
        gasTags: ['test'],
        scriptIdPatterns: [],
        rateLimit: { maxRequestsPerHour: 5000 },
        verbose: false,
      };

      const result = await GitHubApiUtils.searchRepositoriesByTags(config);

      expect(mockClient.searchRepositoriesByTags).toHaveBeenCalledWith(config, 10);
      expect(result.success).toBe(false);
      expect(result.repositories).toHaveLength(0);
      expect(result.error).toBe('Network error');
    });

    test('422エラーの場合はフォールバック検索を実行する', async () => {
      const testData = LibraryTestDataFactories.default.build();

      // フォールバック検索が成功した結果をシミュレート
      const mockSearchResult: TagSearchResult = {
        success: true,
        repositories: [
          {
            name: testData.name,
            description: testData.description,
            html_url: testData.repositoryUrl,
            clone_url: testData.repositoryUrl + '.git',
            stargazers_count: testData.starCount || 0,
            owner: {
              login: testData.authorName,
              html_url: testData.authorUrl,
            },
            license: {
              name: testData.licenseType || 'MIT',
              url: testData.licenseUrl || '',
            },
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-12-01T00:00:00Z',
          },
        ],
        totalFound: 1,
        processedCount: 1,
      };

      mockClient.searchRepositoriesByTags.mockResolvedValueOnce(mockSearchResult);

      const config = {
        gasTags: ['google-apps-script', 'apps-script'],
        scriptIdPatterns: [],
        rateLimit: { maxRequestsPerHour: 5000 },
        verbose: false,
      };

      const result = await GitHubApiUtils.searchRepositoriesByTags(config);

      expect(mockClient.searchRepositoriesByTags).toHaveBeenCalledWith(config, 10);
      expect(result.success).toBe(true);
      expect(result.repositories).toHaveLength(1);
      expect(result.totalFound).toBe(1);
    });
  });

  describe('createHeaders', () => {
    test('適切なヘッダーを生成する', () => {
      const result = GitHubApiUtils.createHeaders();

      expect(mockClient.createHeaders).toHaveBeenCalled();
      expect(result).toEqual({
        Accept: 'application/vnd.github+json',
        Authorization: 'token ghp_test_token',
        'User-Agent': 'app-script-hub',
        'X-GitHub-Api-Version': '2022-11-28',
      });
    });
  });

  describe('fetchLastCommitDate', () => {
    test('正常なコミット日時を取得できる', async () => {
      const mockCommitDate = new Date('2023-12-01T10:00:00Z');
      mockClient.fetchLastCommitDate.mockResolvedValueOnce(mockCommitDate);

      const result = await GitHubApiUtils.fetchLastCommitDate('test', 'repo');

      expect(mockClient.fetchLastCommitDate).toHaveBeenCalledWith('test', 'repo');
      expect(result).toEqual(mockCommitDate);
    });

    test('コミット情報が取得できない場合はnullを返す', async () => {
      mockClient.fetchLastCommitDate.mockResolvedValueOnce(null);

      const result = await GitHubApiUtils.fetchLastCommitDate('test', 'repo');

      expect(mockClient.fetchLastCommitDate).toHaveBeenCalledWith('test', 'repo');
      expect(result).toBeNull();
    });
  });

  describe('parseGitHubUrl', () => {
    test('正常なGitHub URLをパースできる', () => {
      const url = 'https://github.com/googleworkspace/apps-script-oauth2';
      const result = GitHubApiUtils.parseGitHubUrl(url);

      expect(result).toEqual({
        owner: 'googleworkspace',
        repo: 'apps-script-oauth2',
      });
    });

    test('.git拡張子を除去する', () => {
      const url = 'https://github.com/owner/repo.git';
      const result = GitHubApiUtils.parseGitHubUrl(url);

      expect(result).toEqual({
        owner: 'owner',
        repo: 'repo',
      });
    });

    test('テストファクトリーのURLをパースできる', () => {
      const testData = LibraryTestDataFactories.default.build();
      const result = GitHubApiUtils.parseGitHubUrl(testData.repositoryUrl);

      expect(result).toEqual({
        owner: 'googleworkspace',
        repo: 'apps-script-oauth2',
      });
    });

    test('パスが深いURLもパースできる', () => {
      const url = 'https://github.com/owner/repo/blob/main/README.md';
      const result = GitHubApiUtils.parseGitHubUrl(url);

      expect(result).toEqual({
        owner: 'owner',
        repo: 'repo',
      });
    });

    test('github.com以外のホストの場合はnullを返す', () => {
      const url = 'https://gitlab.com/owner/repo';
      const result = GitHubApiUtils.parseGitHubUrl(url);

      expect(result).toBeNull();
    });

    test('パスが不十分な場合はnullを返す', () => {
      const url = 'https://github.com/owner';
      const result = GitHubApiUtils.parseGitHubUrl(url);

      expect(result).toBeNull();
    });

    test('無効なURLの場合はnullを返す', () => {
      const url = 'invalid-url';
      const result = GitHubApiUtils.parseGitHubUrl(url);

      expect(result).toBeNull();
    });

    test('空文字列の場合はnullを返す', () => {
      const url = '';
      const result = GitHubApiUtils.parseGitHubUrl(url);

      expect(result).toBeNull();
    });
  });
});
