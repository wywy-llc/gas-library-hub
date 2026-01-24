/**
 * バリデーション付きライブラリ要約生成サービスのユニットテスト
 */

import { SourceCodeAnalyzerService } from '$lib/server/services/source-code-analyzer-service.js';
import { UsageExampleValidatorService } from '$lib/server/services/usage-example-validator-service.js';
import { ValidatedSummaryGeneratorService } from '$lib/server/services/validated-summary-generator-service.js';
import { GitHubApiUtils } from '$lib/server/utils/github-api-utils.js';
import { XaiUtils } from '$lib/server/utils/xai-utils.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  LibrarySummaryTestDataFactories,
  RepositoryAnalysisTestDataFactories,
  ValidationResultTestDataFactories,
} from '../../../../factories/index.js';

// 依存サービスをモック
vi.mock('$lib/server/services/source-code-analyzer-service.js', () => ({
  SourceCodeAnalyzerService: {
    analyzeRepository: vi.fn(),
    generateSourceSummary: vi.fn(),
  },
}));

vi.mock('$lib/server/services/usage-example-validator-service.js', () => ({
  UsageExampleValidatorService: {
    validate: vi.fn(),
  },
}));

vi.mock('$lib/server/utils/github-api-utils.js', () => ({
  GitHubApiUtils: {
    parseGitHubUrl: vi.fn(),
    fetchReadme: vi.fn(),
  },
}));

vi.mock('$lib/server/utils/xai-utils.js', () => ({
  XaiUtils: {
    getClient: vi.fn(),
  },
}));

vi.mock('$lib/server/utils/rate-limit-util.js', () => ({
  RateLimitUtil: {
    withRetry: vi.fn((fn: () => Promise<unknown>) => fn()),
    exponentialBackoff: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('ValidatedSummaryGeneratorService', () => {
  const mockSummary = LibrarySummaryTestDataFactories.oauth.build();

  const mockXaiClient = {
    chat: {
      completions: {
        create: vi.fn(),
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // デフォルトのモック設定
    vi.mocked(GitHubApiUtils.parseGitHubUrl).mockReturnValue({
      owner: 'owner',
      repo: 'repo',
    });

    vi.mocked(GitHubApiUtils.fetchReadme).mockResolvedValue('# Sample README');

    vi.mocked(XaiUtils.getClient).mockReturnValue(
      mockXaiClient as unknown as ReturnType<typeof XaiUtils.getClient>
    );

    mockXaiClient.chat.completions.create.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(mockSummary) } }],
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('call', () => {
    it('無効なGitHub URLの場合はエラーを投げる', async () => {
      vi.mocked(GitHubApiUtils.parseGitHubUrl).mockReturnValue(null);

      await expect(ValidatedSummaryGeneratorService.call('invalid-url')).rejects.toThrow(
        '無効なGitHub URLです'
      );
    });

    it('ソースコード分析を実行して要約を生成する', async () => {
      const mockAnalysis = RepositoryAnalysisTestDataFactories.default.build();
      vi.mocked(SourceCodeAnalyzerService.analyzeRepository).mockResolvedValue(mockAnalysis);
      vi.mocked(SourceCodeAnalyzerService.generateSourceSummary).mockReturnValue('## 公開API一覧');

      const mockValidation = ValidationResultTestDataFactories.valid.build();
      vi.mocked(UsageExampleValidatorService.validate).mockReturnValue(mockValidation);

      const result = await ValidatedSummaryGeneratorService.call('https://github.com/owner/repo', {
        enableSourceAnalysis: true,
        enableValidation: true,
      });

      expect(SourceCodeAnalyzerService.analyzeRepository).toHaveBeenCalledWith('owner', 'repo');
      expect(result.summary).toBeDefined();
      expect(result.attempts).toBe(1);
      expect(result.sourceAnalysis).toBeDefined();
    });

    it('ソースコード分析を無効にできる', async () => {
      const result = await ValidatedSummaryGeneratorService.call('https://github.com/owner/repo', {
        enableSourceAnalysis: false,
      });

      expect(SourceCodeAnalyzerService.analyzeRepository).not.toHaveBeenCalled();
      expect(result.summary).toBeDefined();
      expect(result.sourceAnalysis).toBeUndefined();
    });

    it('バリデーションを無効にできる', async () => {
      const mockAnalysis = RepositoryAnalysisTestDataFactories.default.build();
      vi.mocked(SourceCodeAnalyzerService.analyzeRepository).mockResolvedValue(mockAnalysis);
      vi.mocked(SourceCodeAnalyzerService.generateSourceSummary).mockReturnValue('## 公開API一覧');

      const result = await ValidatedSummaryGeneratorService.call('https://github.com/owner/repo', {
        enableSourceAnalysis: true,
        enableValidation: false,
      });

      expect(UsageExampleValidatorService.validate).not.toHaveBeenCalled();
      expect(result.validationResult).toBeUndefined();
    });

    it('バリデーション成功時は1回の試行で完了する', async () => {
      const mockAnalysis = RepositoryAnalysisTestDataFactories.default.build();
      vi.mocked(SourceCodeAnalyzerService.analyzeRepository).mockResolvedValue(mockAnalysis);
      vi.mocked(SourceCodeAnalyzerService.generateSourceSummary).mockReturnValue('## 公開API一覧');

      const mockValidation = ValidationResultTestDataFactories.valid.build();
      vi.mocked(UsageExampleValidatorService.validate).mockReturnValue(mockValidation);

      const result = await ValidatedSummaryGeneratorService.call('https://github.com/owner/repo', {
        enableSourceAnalysis: true,
        enableValidation: true,
      });

      expect(result.attempts).toBe(1);
      expect(result.validationResult?.isValid).toBe(true);
    });

    it('バリデーション失敗時は再生成を試行する', async () => {
      const mockAnalysis = RepositoryAnalysisTestDataFactories.default.build();
      vi.mocked(SourceCodeAnalyzerService.analyzeRepository).mockResolvedValue(mockAnalysis);
      vi.mocked(SourceCodeAnalyzerService.generateSourceSummary).mockReturnValue('## 公開API一覧');

      // 1回目: 失敗、2回目: 成功
      const invalidValidation = ValidationResultTestDataFactories.invalid.build();
      const validValidation = ValidationResultTestDataFactories.valid.build();
      vi.mocked(UsageExampleValidatorService.validate)
        .mockReturnValueOnce(invalidValidation)
        .mockReturnValueOnce(validValidation);

      const result = await ValidatedSummaryGeneratorService.call('https://github.com/owner/repo', {
        enableSourceAnalysis: true,
        enableValidation: true,
        maxAttempts: 3,
      });

      expect(result.attempts).toBe(2);
      expect(result.validationResult?.isValid).toBe(true);
      expect(mockXaiClient.chat.completions.create).toHaveBeenCalledTimes(2);
    });

    it('最大試行回数に達した場合は最後の結果を返す', async () => {
      const mockAnalysis = RepositoryAnalysisTestDataFactories.default.build();
      vi.mocked(SourceCodeAnalyzerService.analyzeRepository).mockResolvedValue(mockAnalysis);
      vi.mocked(SourceCodeAnalyzerService.generateSourceSummary).mockReturnValue('## 公開API一覧');

      const invalidValidation = ValidationResultTestDataFactories.invalid.build();
      vi.mocked(UsageExampleValidatorService.validate).mockReturnValue(invalidValidation);

      const result = await ValidatedSummaryGeneratorService.call('https://github.com/owner/repo', {
        enableSourceAnalysis: true,
        enableValidation: true,
        maxAttempts: 2,
      });

      expect(result.attempts).toBe(2);
      expect(result.validationResult?.isValid).toBe(false);
      expect(mockXaiClient.chat.completions.create).toHaveBeenCalledTimes(2);
    });

    it('分析失敗時はバリデーションをスキップする', async () => {
      const failedAnalysis = RepositoryAnalysisTestDataFactories.failed.build();
      vi.mocked(SourceCodeAnalyzerService.analyzeRepository).mockResolvedValue(failedAnalysis);

      const result = await ValidatedSummaryGeneratorService.call('https://github.com/owner/repo', {
        enableSourceAnalysis: true,
        enableValidation: true,
      });

      expect(UsageExampleValidatorService.validate).not.toHaveBeenCalled();
      expect(result.validationResult).toBeUndefined();
      expect(result.attempts).toBe(1);
    });

    it('公開APIが空の場合はバリデーションをスキップする', async () => {
      const emptyApisAnalysis = RepositoryAnalysisTestDataFactories.emptyApis.build();
      vi.mocked(SourceCodeAnalyzerService.analyzeRepository).mockResolvedValue(emptyApisAnalysis);

      const result = await ValidatedSummaryGeneratorService.call('https://github.com/owner/repo', {
        enableSourceAnalysis: true,
        enableValidation: true,
      });

      expect(UsageExampleValidatorService.validate).not.toHaveBeenCalled();
      expect(result.validationResult).toBeUndefined();
    });

    it('API呼び出しエラー時は再試行する', async () => {
      const mockAnalysis = RepositoryAnalysisTestDataFactories.default.build();
      vi.mocked(SourceCodeAnalyzerService.analyzeRepository).mockResolvedValue(mockAnalysis);
      vi.mocked(SourceCodeAnalyzerService.generateSourceSummary).mockReturnValue('## 公開API一覧');

      const mockValidation = ValidationResultTestDataFactories.valid.build();
      vi.mocked(UsageExampleValidatorService.validate).mockReturnValue(mockValidation);

      // 1回目: エラー、2回目: 成功
      mockXaiClient.chat.completions.create
        .mockRejectedValueOnce(new Error('API Error'))
        .mockResolvedValueOnce({
          choices: [{ message: { content: JSON.stringify(mockSummary) } }],
        });

      const result = await ValidatedSummaryGeneratorService.call('https://github.com/owner/repo', {
        enableSourceAnalysis: true,
        enableValidation: true,
        maxAttempts: 3,
      });

      expect(result.attempts).toBe(2);
      expect(result.summary).toBeDefined();
    });

    it('全ての試行でAPI呼び出しが失敗した場合はエラーを投げる', async () => {
      const mockAnalysis = RepositoryAnalysisTestDataFactories.default.build();
      vi.mocked(SourceCodeAnalyzerService.analyzeRepository).mockResolvedValue(mockAnalysis);
      vi.mocked(SourceCodeAnalyzerService.generateSourceSummary).mockReturnValue('## 公開API一覧');

      mockXaiClient.chat.completions.create.mockRejectedValue(new Error('API Error'));

      await expect(
        ValidatedSummaryGeneratorService.call('https://github.com/owner/repo', {
          enableSourceAnalysis: true,
          enableValidation: true,
          maxAttempts: 2,
        })
      ).rejects.toThrow('API Error');
    });

    it('verboseオプションでログを出力する', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const mockAnalysis = RepositoryAnalysisTestDataFactories.default.build();
      vi.mocked(SourceCodeAnalyzerService.analyzeRepository).mockResolvedValue(mockAnalysis);
      vi.mocked(SourceCodeAnalyzerService.generateSourceSummary).mockReturnValue('## 公開API一覧');

      const mockValidation = ValidationResultTestDataFactories.valid.build();
      vi.mocked(UsageExampleValidatorService.validate).mockReturnValue(mockValidation);

      await ValidatedSummaryGeneratorService.call('https://github.com/owner/repo', {
        verbose: true,
      });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('READMEが取得できない場合もエラーなく動作する', async () => {
      vi.mocked(GitHubApiUtils.fetchReadme).mockResolvedValue(undefined);

      const result = await ValidatedSummaryGeneratorService.call('https://github.com/owner/repo', {
        enableSourceAnalysis: false,
      });

      expect(result.summary).toBeDefined();
    });
  });
});
