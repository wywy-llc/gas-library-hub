import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { CheckLibraryCommitStatusService } from '../../../../../src/lib/server/services/check-library-commit-status-service.js';
import { CheckLibrarySummaryExistenceService } from '../../../../../src/lib/server/services/check-library-summary-existence-service.js';
import { GenerateAiSummaryService } from '../../../../../src/lib/server/services/generate-ai-summary-service.js';
import {
  ProcessBulkGASLibraryWithSaveService,
  type LibrarySaveWithSummaryCallback,
} from '../../../../../src/lib/server/services/process-bulk-gas-library-with-save-service.js';
import { ScrapeGASLibraryService } from '../../../../../src/lib/server/services/scrape-gas-library-service.js';
import { GitHubApiUtils } from '../../../../../src/lib/server/utils/github-api-utils.js';
import type { TagSearchResult } from '../../../../../src/lib/types/github-scraper.js';
import {
  GitHubRepositoryTestDataFactories,
  ScrapeResultTestDataFactories,
  ScraperConfigTestDataFactories,
} from '../../../../factories/index.js';

// モックの設定
vi.mock('../../../../../src/lib/server/utils/github-api-utils.js');
vi.mock('../../../../../src/lib/server/services/scrape-gas-library-service.js');
vi.mock('../../../../../src/lib/server/services/check-library-commit-status-service.js');
vi.mock('../../../../../src/lib/server/services/check-library-summary-existence-service.js');
vi.mock('../../../../../src/lib/server/services/generate-ai-summary-service.js');

const mockedGitHubApiUtils = vi.mocked(GitHubApiUtils, true);
const mockedScrapeGASLibraryService = vi.mocked(ScrapeGASLibraryService, true);
const mockedCheckLibraryCommitStatusService = vi.mocked(CheckLibraryCommitStatusService, true);
const mockedCheckLibrarySummaryExistenceService = vi.mocked(
  CheckLibrarySummaryExistenceService,
  true
);
const mockedGenerateAiSummaryService = vi.mocked(GenerateAiSummaryService, true);

describe('ProcessBulkGASLibraryWithSaveService', () => {
  const mockConfig = ScraperConfigTestDataFactories.default.build();
  const testRepo1 = GitHubRepositoryTestDataFactories.default.build();
  const testRepo2 = GitHubRepositoryTestDataFactories.oauthLibrary.build();
  const mockSaveCallback = vi.fn<LibrarySaveWithSummaryCallback>();
  const mockDuplicateChecker = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockSaveCallback.mockClear();
    mockDuplicateChecker.mockClear();
    mockedCheckLibraryCommitStatusService.call.mockClear();
    mockedGenerateAiSummaryService.call.mockClear();
    mockedCheckLibrarySummaryExistenceService.call.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('call', () => {
    test('lastCommitAtが2年前以上の場合はスキップされる', async () => {
      // 2年前以上の古い日付を設定
      const threeYearsAgo = new Date();
      threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);

      // GitHub検索のモック
      const mockSearchResult: TagSearchResult = {
        success: true,
        repositories: [testRepo1],
        totalFound: 1,
        processedCount: 1,
      };
      mockedGitHubApiUtils.searchRepositoriesByPageRange.mockResolvedValue(mockSearchResult);

      // スクレイピング結果のモック（古いコミット日時）
      const oldCommitScrapeResult = ScrapeResultTestDataFactories.success.build();
      oldCommitScrapeResult.data!.lastCommitAt = threeYearsAgo;
      mockedScrapeGASLibraryService.call.mockResolvedValue(oldCommitScrapeResult);

      // 重複チェッカー（重複なし）
      mockDuplicateChecker.mockResolvedValue(false);

      // テスト実行
      const promise = ProcessBulkGASLibraryWithSaveService.call(
        1,
        1,
        10,
        mockDuplicateChecker,
        mockSaveCallback,
        undefined, // sortOption
        true,
        mockConfig
      );

      await vi.advanceTimersByTimeAsync(1000);
      const result = await promise;

      // 検証
      expect(result.success).toBe(false); // 処理対象がスキップされたため失敗
      expect(result.results).toHaveLength(0); // スキップされたため結果は空
      expect(result.successCount).toBe(0);
      expect(result.errorCount).toBe(0);

      // 保存コールバックは呼ばれない
      expect(mockSaveCallback).not.toHaveBeenCalled();
    });

    test('lastCommitAtが2年以内の場合は正常に処理される', async () => {
      // 6ヶ月前の日付を設定
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      // GitHub検索のモック
      const mockSearchResult: TagSearchResult = {
        success: true,
        repositories: [testRepo1],
        totalFound: 1,
        processedCount: 1,
      };
      mockedGitHubApiUtils.searchRepositoriesByPageRange.mockResolvedValue(mockSearchResult);

      // スクレイピング結果のモック（最近のコミット日時）
      const recentCommitScrapeResult = ScrapeResultTestDataFactories.success.build();
      recentCommitScrapeResult.data!.lastCommitAt = sixMonthsAgo;
      mockedScrapeGASLibraryService.call.mockResolvedValue(recentCommitScrapeResult);

      // 重複チェッカー（重複なし）
      mockDuplicateChecker.mockResolvedValue(false);

      // 保存コールバック（成功）
      mockSaveCallback.mockResolvedValue({ success: true, id: 'test-library-id' });

      // AI要約関連のモック
      mockedCheckLibraryCommitStatusService.call.mockResolvedValue({
        isNew: true,
        shouldUpdate: false,
        libraryId: undefined,
      });
      mockedGenerateAiSummaryService.call.mockResolvedValue(undefined);

      // テスト実行
      const promise = ProcessBulkGASLibraryWithSaveService.call(
        1,
        1,
        10,
        mockDuplicateChecker,
        mockSaveCallback,
        undefined, // sortOption
        true,
        mockConfig
      );

      await vi.advanceTimersByTimeAsync(1000);
      const result = await promise;

      // 検証
      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(1);
      expect(result.results[0].success).toBe(true);
      expect(result.successCount).toBe(1);
      expect(result.errorCount).toBe(0);

      // 保存コールバックが呼ばれる
      expect(mockSaveCallback).toHaveBeenCalledWith(recentCommitScrapeResult.data, true);

      // AI要約生成も実行される（GenerateAiSummaryServiceが呼ばれる）
      expect(mockedGenerateAiSummaryService.call).toHaveBeenCalledWith(
        expect.objectContaining({
          libraryId: 'test-library-id',
          githubUrl: testRepo1.html_url,
          skipOnError: true,
        })
      );
    });

    test('verboseモードでスキップ理由がログ出力される', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      // 6ヶ月前の日付を設定
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      // GitHub検索のモック
      const mockSearchResult: TagSearchResult = {
        success: true,
        repositories: [testRepo1],
        totalFound: 1,
        processedCount: 1,
      };
      mockedGitHubApiUtils.searchRepositoriesByPageRange.mockResolvedValue(mockSearchResult);

      // スクレイピング結果のモック
      const recentCommitScrapeResult = ScrapeResultTestDataFactories.success.build();
      recentCommitScrapeResult.data!.lastCommitAt = sixMonthsAgo;
      mockedScrapeGASLibraryService.call.mockResolvedValue(recentCommitScrapeResult);

      // 重複チェッカー（重複なし）
      mockDuplicateChecker.mockResolvedValue(false);

      // 保存コールバック（成功）
      mockSaveCallback.mockResolvedValue({ success: true, id: 'test-library-id' });

      // AI要約関連のモック（要約生成不要）
      mockedCheckLibraryCommitStatusService.call.mockResolvedValue({
        isNew: false,
        shouldUpdate: false,
        libraryId: 'existing-library-id',
      });
      mockedCheckLibrarySummaryExistenceService.call.mockResolvedValue(true);

      const verboseConfig = ScraperConfigTestDataFactories.verbose.build();

      // テスト実行
      const promise = ProcessBulkGASLibraryWithSaveService.call(
        1,
        1,
        10,
        mockDuplicateChecker,
        mockSaveCallback,
        undefined, // sortOption
        true,
        verboseConfig
      );

      await vi.advanceTimersByTimeAsync(1000);
      await promise;

      // 検証
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('AI要約生成スキップ'));

      consoleSpy.mockRestore();
    });

    test('複数リポジトリで一部スキップ、一部処理される', async () => {
      // 古い日付と新しい日付を準備
      const threeYearsAgo = new Date();
      threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      // GitHub検索のモック（2つのリポジトリ）
      const mockSearchResult: TagSearchResult = {
        success: true,
        repositories: [testRepo1, testRepo2],
        totalFound: 2,
        processedCount: 2,
      };
      mockedGitHubApiUtils.searchRepositoriesByPageRange.mockResolvedValue(mockSearchResult);

      // スクレイピング結果のモック
      const oldCommitScrapeResult = ScrapeResultTestDataFactories.success.build();
      oldCommitScrapeResult.data!.lastCommitAt = threeYearsAgo; // 古いコミット

      const recentCommitScrapeResult = ScrapeResultTestDataFactories.successWithOAuth.build();
      recentCommitScrapeResult.data!.lastCommitAt = sixMonthsAgo; // 新しいコミット

      mockedScrapeGASLibraryService.call
        .mockResolvedValueOnce(oldCommitScrapeResult)
        .mockResolvedValueOnce(recentCommitScrapeResult);

      // 重複チェッカー（重複なし）
      mockDuplicateChecker.mockResolvedValue(false);

      // 保存コールバック（成功）
      mockSaveCallback.mockResolvedValue({ success: true, id: 'test-library-id' });

      // AI要約関連のモック
      mockedCheckLibraryCommitStatusService.call.mockResolvedValue({
        isNew: true,
        shouldUpdate: false,
        libraryId: undefined,
      });
      mockedGenerateAiSummaryService.call.mockResolvedValue(undefined);

      // テスト実行
      const promise = ProcessBulkGASLibraryWithSaveService.call(
        1,
        1,
        10,
        mockDuplicateChecker,
        mockSaveCallback,
        undefined, // sortOption
        true,
        mockConfig
      );

      await vi.advanceTimersByTimeAsync(2000);
      const result = await promise;

      // 検証
      expect(result.success).toBe(true); // 1つでも成功すればtrue
      expect(result.results).toHaveLength(1); // 1つ目はスキップで結果に含まれない、2つ目のみ
      expect(result.successCount).toBe(1);
      expect(result.errorCount).toBe(0);

      // 結果は新しいコミットのみ
      expect(result.results[0].success).toBe(true);

      // 保存コールバックは1回だけ呼ばれる（新しいコミットのみ）
      expect(mockSaveCallback).toHaveBeenCalledTimes(1);
      expect(mockSaveCallback).toHaveBeenCalledWith(recentCommitScrapeResult.data, true);
    });

    test('AI要約生成が無効な場合は要約処理をスキップする', async () => {
      // 6ヶ月前の日付を設定
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      // GitHub検索のモック
      const mockSearchResult: TagSearchResult = {
        success: true,
        repositories: [testRepo1],
        totalFound: 1,
        processedCount: 1,
      };
      mockedGitHubApiUtils.searchRepositoriesByPageRange.mockResolvedValue(mockSearchResult);

      // スクレイピング結果のモック
      const recentCommitScrapeResult = ScrapeResultTestDataFactories.success.build();
      recentCommitScrapeResult.data!.lastCommitAt = sixMonthsAgo;
      mockedScrapeGASLibraryService.call.mockResolvedValue(recentCommitScrapeResult);

      // 重複チェッカー（重複なし）
      mockDuplicateChecker.mockResolvedValue(false);

      // 保存コールバック（成功）
      mockSaveCallback.mockResolvedValue({ success: true, id: 'test-library-id' });

      // テスト実行（AI要約生成無効）
      const promise = ProcessBulkGASLibraryWithSaveService.call(
        1,
        1,
        10,
        mockDuplicateChecker,
        mockSaveCallback,
        undefined, // sortOption
        false, // generateSummary = false
        mockConfig
      );

      await vi.advanceTimersByTimeAsync(1000);
      const result = await promise;

      // 検証
      expect(result.success).toBe(true);
      expect(result.successCount).toBe(1);

      // 保存コールバックが呼ばれる（AI要約無効）
      expect(mockSaveCallback).toHaveBeenCalledWith(recentCommitScrapeResult.data, false);

      // AI要約関連の処理は呼ばれない
      expect(mockedCheckLibraryCommitStatusService.call).not.toHaveBeenCalled();
      expect(mockedGenerateAiSummaryService.call).not.toHaveBeenCalled();
    });
  });
});
