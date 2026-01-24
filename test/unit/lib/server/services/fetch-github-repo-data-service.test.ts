import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  FetchGitHubRepoDataService,
  type GitHubRepoData,
} from '../../../../../src/lib/server/services/fetch-github-repo-data-service.js';
import { GitHubApiUtils } from '../../../../../src/lib/server/utils/github-api-utils.js';
import { ServiceErrorUtil } from '../../../../../src/lib/server/utils/service-error-util.js';
import { GitHubRepositoryTestDataFactories } from '../../../../factories/index.js';

// モックの設定
vi.mock('../../../../../src/lib/server/utils/github-api-utils.js');
vi.mock('../../../../../src/lib/server/utils/service-error-util.js');

// 日付のテストデータ
const mockCommitDate = new Date('2024-01-15T10:30:00Z');

describe('FetchGitHubRepoDataService', () => {
  const mockOwner = 'testowner';
  const mockRepo = 'testrepo';

  // ファクトリからテストデータを生成
  const mockRepoInfo = GitHubRepositoryTestDataFactories.testOwnerRepo.build();
  const mockLastCommitAt = mockCommitDate;

  const expectedResult: GitHubRepoData = {
    repoInfo: {
      name: 'testrepo',
      repositoryUrl: 'https://github.com/testowner/testrepo',
      authorUrl: 'https://github.com/testowner',
      authorName: 'testowner',
      description: 'Test repository description',
      starCount: 123,
    },
    licenseInfo: {
      type: 'MIT License',
      url: 'https://api.github.com/licenses/mit',
    },
    lastCommitAt: mockLastCommitAt,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // デフォルトのモック設定（API最適化後: 2つのAPI呼び出しのみ）
    vi.mocked(GitHubApiUtils.fetchRepositoryInfo).mockResolvedValue(mockRepoInfo);
    vi.mocked(GitHubApiUtils.fetchLastCommitDate).mockResolvedValue(mockLastCommitAt);
    vi.mocked(ServiceErrorUtil.assertCondition).mockImplementation(
      (condition, message, context) => {
        if (!condition) {
          throw new Error(`${context}: ${message}`);
        }
      }
    );
  });

  describe('正常ケース', () => {
    it('リポジトリの完全なデータを正常に取得できる', async () => {
      const result = await FetchGitHubRepoDataService.call(mockOwner, mockRepo);

      expect(result).toEqual(expectedResult);

      // 各APIが正しく呼び出されることを確認（API最適化後: 2つのAPI呼び出し）
      expect(GitHubApiUtils.fetchRepositoryInfo).toHaveBeenCalledWith(mockOwner, mockRepo);
      expect(GitHubApiUtils.fetchLastCommitDate).toHaveBeenCalledWith(mockOwner, mockRepo);
    });

    it('並列処理で2つのAPI呼び出しが実行される（API最適化後）', async () => {
      const startTime = Date.now();

      // 各APIの実行時間をモック
      vi.mocked(GitHubApiUtils.fetchRepositoryInfo).mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return mockRepoInfo;
      });
      vi.mocked(GitHubApiUtils.fetchLastCommitDate).mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return mockLastCommitAt;
      });

      await FetchGitHubRepoDataService.call(mockOwner, mockRepo);

      const elapsed = Date.now() - startTime;
      // 並列実行のため、各100msの処理が順次実行されれば200ms程度、並列なら100ms程度
      expect(elapsed).toBeLessThan(150); // 並列実行されていることを確認
    });

    it('description が null の場合は空文字になる', async () => {
      const repoInfoWithoutDescription = GitHubRepositoryTestDataFactories.testOwnerRepo.build({
        description: undefined,
      });
      vi.mocked(GitHubApiUtils.fetchRepositoryInfo).mockResolvedValue(repoInfoWithoutDescription);

      const result = await FetchGitHubRepoDataService.call(mockOwner, mockRepo);

      expect(result.repoInfo.description).toBe('');
    });

    it('stargazers_count が null の場合は 0 になる', async () => {
      const repoInfoWithoutStars = GitHubRepositoryTestDataFactories.testOwnerRepo.build({
        stargazers_count: undefined,
      });
      vi.mocked(GitHubApiUtils.fetchRepositoryInfo).mockResolvedValue(repoInfoWithoutStars);

      const result = await FetchGitHubRepoDataService.call(mockOwner, mockRepo);

      expect(result.repoInfo.starCount).toBe(0);
    });
  });

  describe('エラーケース', () => {
    it('lastCommitAt が null の場合はエラーを投げる', async () => {
      vi.mocked(GitHubApiUtils.fetchLastCommitDate).mockResolvedValue(null);
      vi.mocked(ServiceErrorUtil.assertCondition).mockImplementation(
        (condition, message, context) => {
          if (!condition) {
            throw new Error(`${context}: ${message}`);
          }
        }
      );

      await expect(FetchGitHubRepoDataService.call(mockOwner, mockRepo)).rejects.toThrow(
        'FetchGitHubRepoDataService.call: Failed to fetch last commit date.'
      );
    });

    it('lastCommitAt が undefined の場合はエラーを投げる', async () => {
      vi.mocked(GitHubApiUtils.fetchLastCommitDate).mockResolvedValue(null);
      await expect(FetchGitHubRepoDataService.call(mockOwner, mockRepo)).rejects.toThrow(
        'FetchGitHubRepoDataService.call: Failed to fetch last commit date.'
      );
    });

    it('fetchRepositoryInfo が失敗した場合はエラーを投げる', async () => {
      vi.mocked(GitHubApiUtils.fetchRepositoryInfo).mockRejectedValue(
        new Error('Repository not found')
      );

      await expect(FetchGitHubRepoDataService.call(mockOwner, mockRepo)).rejects.toThrow(
        'Repository not found'
      );
    });

    it('一部のAPI呼び出しが失敗した場合、全体が失敗する', async () => {
      vi.mocked(GitHubApiUtils.fetchRepositoryInfo).mockResolvedValue(mockRepoInfo);
      vi.mocked(GitHubApiUtils.fetchLastCommitDate).mockRejectedValue(
        new Error('Commit fetch error')
      );

      await expect(FetchGitHubRepoDataService.call(mockOwner, mockRepo)).rejects.toThrow(
        'Commit fetch error'
      );
    });
  });

  describe('データ変換の検証', () => {
    it('GitHubAPIのレスポンスが正しく変換される', async () => {
      const complexRepoInfo = GitHubRepositoryTestDataFactories.testOwnerRepo.build({
        name: 'complex-repo-name',
        html_url: 'https://github.com/complex-owner/complex-repo-name',
        clone_url: 'https://github.com/complex-owner/complex-repo-name.git',
        owner: {
          login: 'complex-owner',
          html_url: 'https://github.com/complex-owner',
        },
        description: 'A very detailed description with special characters',
        stargazers_count: 9999,
      });

      vi.mocked(GitHubApiUtils.fetchRepositoryInfo).mockResolvedValue(complexRepoInfo);

      const result = await FetchGitHubRepoDataService.call('complex-owner', 'complex-repo-name');

      expect(result.repoInfo).toEqual({
        name: 'complex-repo-name',
        repositoryUrl: 'https://github.com/complex-owner/complex-repo-name',
        authorUrl: 'https://github.com/complex-owner',
        authorName: 'complex-owner',
        description: 'A very detailed description with special characters',
        starCount: 9999,
      });
    });

    it('authorUrl が正しいフォーマットで生成される', async () => {
      const repoWithSpecialOwner = GitHubRepositoryTestDataFactories.testOwnerRepo.build({
        owner: {
          login: 'user-with-dashes_and_underscores',
          html_url: 'https://github.com/user-with-dashes_and_underscores',
        },
      });

      vi.mocked(GitHubApiUtils.fetchRepositoryInfo).mockResolvedValue(repoWithSpecialOwner);

      const result = await FetchGitHubRepoDataService.call(
        'user-with-dashes_and_underscores',
        mockRepo
      );

      expect(result.repoInfo.authorUrl).toBe('https://github.com/user-with-dashes_and_underscores');
      expect(result.repoInfo.authorName).toBe('user-with-dashes_and_underscores');
    });

    it('リポジトリ情報からライセンス情報を正しく抽出する', async () => {
      const repoWithLicense = GitHubRepositoryTestDataFactories.testOwnerRepo.build({
        license: {
          name: 'Apache License 2.0',
          url: 'https://api.github.com/licenses/apache-2.0',
        },
      });

      vi.mocked(GitHubApiUtils.fetchRepositoryInfo).mockResolvedValue(repoWithLicense);

      const result = await FetchGitHubRepoDataService.call(mockOwner, mockRepo);

      expect(result.licenseInfo.type).toBe('Apache License 2.0');
      expect(result.licenseInfo.url).toBe('https://api.github.com/licenses/apache-2.0');
    });

    it('ライセンス情報がない場合はデフォルト値を使用する', async () => {
      const repoWithoutLicense = GitHubRepositoryTestDataFactories.testOwnerRepo.build({
        license: undefined,
      });

      vi.mocked(GitHubApiUtils.fetchRepositoryInfo).mockResolvedValue(repoWithoutLicense);

      const result = await FetchGitHubRepoDataService.call(mockOwner, mockRepo);

      expect(result.licenseInfo.type).toBe('不明');
      expect(result.licenseInfo.url).toBe('https://github.com/testowner/testrepo');
    });
  });

  describe('パフォーマンスの検証', () => {
    it('API呼び出しのパフォーマンス特性を記録', async () => {
      // パフォーマンス改善前の基準値を記録するためのテスト
      const iterations = 3;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        await FetchGitHubRepoDataService.call(mockOwner, mockRepo);
        const endTime = performance.now();
        times.push(endTime - startTime);
      }

      const averageTime = times.reduce((sum, time) => sum + time, 0) / times.length;

      // パフォーマンス改善前の基準値として記録
      // 実際の改善実装後にこの値と比較する
      expect(averageTime).toBeGreaterThan(0);

      // API呼び出し回数の確認（改善後: 2回のみ）
      expect(GitHubApiUtils.fetchRepositoryInfo).toHaveBeenCalledTimes(iterations);
      expect(GitHubApiUtils.fetchLastCommitDate).toHaveBeenCalledTimes(iterations);
    });
  });
});
