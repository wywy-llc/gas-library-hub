import { type GitHubSearchSortOption } from '$lib/constants/github-search.js';
import { DEFAULT_SCRAPER_CONFIG } from '$lib/constants/scraper-config.js';
import { ErrorUtils } from '$lib/server/utils/error-utils.js';
import { GitHubApiUtils } from '$lib/server/utils/github-api-utils.js';
import type {
  BulkScrapeResult,
  ScrapeResult,
  ScrapedLibraryData,
  ScraperConfig,
} from '$lib/types/github-scraper.js';

import { CheckLibraryCommitStatusService } from './check-library-commit-status-service.js';
import { CheckLibrarySummaryExistenceService } from './check-library-summary-existence-service.js';
import { GenerateAiSummaryService } from './generate-ai-summary-service.js';

import { ScrapeGASLibraryService } from './scrape-gas-library-service.js';

/**
 * GitHub検索結果のリポジトリ情報の型定義
 */
interface GitHubRepository {
  html_url: string;
  name: string;
}

/**
 * ライブラリデータの保存用コールバック関数の型定義
 */
export type LibrarySaveWithSummaryCallback = (
  libraryData: ScrapedLibraryData,
  generateSummary?: boolean
) => Promise<{ success: boolean; id?: string; error?: string }>;

/**
 * GASライブラリ一括処理（保存・AI要約付き）サービス
 * GitHub検索、スクレイピング、DB保存、AI要約生成を統合して実行
 *
 * 使用例:
 * ```typescript
 * const result = await ProcessBulkGASLibraryWithSaveService.call(
 *   1, 3, 10,
 *   duplicateChecker,
 *   saveCallback,
 *   'stars',
 *   true
 * );
 * ```
 *
 * 動作原理:
 * 1. 指定ページ範囲でGitHub検索を実行
 * 2. 各リポジトリをスクレイピング
 * 3. 2年以内のコミットのみフィルタリング
 * 4. 重複チェックを実行
 * 5. データベースに保存
 * 6. 必要に応じてAI要約を生成
 */
export class ProcessBulkGASLibraryWithSaveService {
  /** 並列処理のバッチサイズ */
  private static readonly BATCH_SIZE = 5;
  /** コミット日時の有効期限（年） */
  private static readonly COMMIT_AGE_THRESHOLD_YEARS = 2;
  /** ページ間の待機時間（ミリ秒） */
  private static readonly PAGE_DELAY_MS = 500;

  /**
   * 詳細ログ出力（verbose有効時のみ）
   * @private
   */
  private static log(config: ScraperConfig, message: string): void {
    if (config.verbose) console.log(message);
  }

  /**
   * エラーログ出力（verbose有効時のみ）
   * @private
   */
  private static logError(config: ScraperConfig, message: string, error?: unknown): void {
    if (config.verbose) console.error(message, error);
  }

  /**
   * コミットが古すぎるかチェック
   * @private
   */
  private static isCommitTooOld(lastCommitAt: Date): boolean {
    const threshold = new Date();
    threshold.setFullYear(threshold.getFullYear() - this.COMMIT_AGE_THRESHOLD_YEARS);
    return lastCommitAt < threshold;
  }

  /**
   * AI要約を生成すべきか判定
   * @private
   */
  private static async shouldGenerateAiSummary(
    repoUrl: string,
    lastCommitAt: Date,
    generateSummary: boolean
  ): Promise<boolean> {
    if (!generateSummary) return false;

    const commitStatus = await CheckLibraryCommitStatusService.call(repoUrl, lastCommitAt);

    // 新規ライブラリの場合は常にAI要約生成
    if (!commitStatus.libraryId) {
      return true;
    }

    // 既存ライブラリの場合、library_summaryの存在をチェック
    const summaryExists = await CheckLibrarySummaryExistenceService.call(commitStatus.libraryId);

    // 新規、更新が必要、またはサマリーが存在しない場合に生成
    return commitStatus.isNew || commitStatus.shouldUpdate || !summaryExists;
  }
  /**
   * ページ範囲指定でGASライブラリを検索・保存・AI要約生成
   *
   * @param startPage - 開始ページ（1から開始）
   * @param endPage - 終了ページ
   * @param perPage - ページあたりの結果数
   * @param duplicateChecker - 重複チェック関数
   * @param saveCallback - 保存処理コールバック
   * @param sortOption - ソート条件（省略時はconfig.github.sortByを使用）
   * @param generateSummary - AI要約生成を行うか（デフォルト: true）
   * @param config - スクレイパー設定（省略時はデフォルト設定を使用）
   * @returns 一括処理結果
   */
  public static async call(
    startPage: number,
    endPage: number,
    perPage: number,
    duplicateChecker: (scriptId: string) => Promise<boolean>,
    saveCallback: LibrarySaveWithSummaryCallback,
    sortOption?: GitHubSearchSortOption,
    generateSummary: boolean = true,
    config: ScraperConfig = DEFAULT_SCRAPER_CONFIG
  ): Promise<BulkScrapeResult> {
    const allResults: ScrapeResult[] = [];
    let totalDuplicateCount = 0;
    let totalProcessedCount = 0;

    try {
      this.log(
        config,
        `ページ範囲指定一括検索・保存・AI要約生成開始: ページ ${startPage}-${endPage} (${perPage}件/ページ, AI要約: ${generateSummary ? '有効' : '無効'})`
      );

      // ページごとに処理
      for (let currentPage = startPage; currentPage <= endPage; currentPage++) {
        this.log(config, `\n=== ページ ${currentPage} の処理開始 ===`);

        try {
          // 1ページ分のリポジトリを検索
          const searchResult = await GitHubApiUtils.searchRepositoriesByPageRange(
            config,
            currentPage,
            currentPage, // 1ページのみ
            perPage,
            sortOption
          );

          if (!searchResult.success) {
            this.log(config, `ページ ${currentPage} の検索に失敗: ${searchResult.error}`);
            // 検索失敗をエラー結果として記録
            allResults.push({
              success: false,
              error: `ページ ${currentPage}: ${searchResult.error || 'GitHub検索に失敗しました'}`,
            });
            continue;
          }

          this.log(
            config,
            `ページ ${currentPage}: ${searchResult.processedCount}件のリポジトリを検索`
          );

          totalProcessedCount += searchResult.processedCount;

          // ページ内のリポジトリをバッチ処理で並列実行
          const batchResults = await this.processBatchRepositories(
            searchResult.repositories,
            duplicateChecker,
            saveCallback,
            generateSummary,
            config
          );

          totalDuplicateCount += batchResults.duplicateCount;
          allResults.push(...batchResults.results);

          this.log(config, `=== ページ ${currentPage} の処理完了 ===\n`);

          // ページ間の待機
          if (currentPage < endPage) {
            await new Promise(resolve => setTimeout(resolve, this.PAGE_DELAY_MS));
          }
        } catch (pageError) {
          this.logError(config, `ページ ${currentPage} の処理エラー:`, pageError);
          allResults.push({
            success: false,
            error: `ページ ${currentPage}: ${ErrorUtils.getMessage(pageError, '処理に失敗しました')}`,
          });
        }
      }

      const successCount = allResults.filter(r => r.success).length;
      const errorCount = allResults.filter(r => !r.success).length;

      this.log(
        config,
        `\n一括処理完了: 成功 ${successCount}件 / エラー ${errorCount}件 / 重複 ${totalDuplicateCount}件 / 処理済み ${totalProcessedCount}件`
      );

      return {
        success: successCount > 0,
        results: allResults,
        total: totalProcessedCount,
        successCount,
        errorCount,
        duplicateCount: totalDuplicateCount,
      };
    } catch (error) {
      console.error('一括処理エラー:', error);
      return {
        success: false,
        results: [
          {
            success: false,
            error: ErrorUtils.getMessage(error, '一括処理に失敗しました'),
          },
        ],
        total: totalProcessedCount,
        successCount: 0,
        errorCount: 1,
        duplicateCount: totalDuplicateCount,
      };
    }
  }

  /**
   * リポジトリリストをバッチ処理で並列実行
   * @private
   */
  private static async processBatchRepositories(
    repositories: GitHubRepository[],
    duplicateChecker: (scriptId: string) => Promise<boolean>,
    saveCallback: LibrarySaveWithSummaryCallback,
    generateSummary: boolean,
    config: ScraperConfig
  ): Promise<{ results: ScrapeResult[]; duplicateCount: number }> {
    const results: ScrapeResult[] = [];
    let duplicateCount = 0;

    // リポジトリをバッチに分割
    const batches = this.chunkArray(repositories, this.BATCH_SIZE);

    for (const batch of batches) {
      // バッチ内のリポジトリを並列処理
      const batchPromises = batch.map(repo =>
        this.processRepository(repo, duplicateChecker, saveCallback, generateSummary, config)
      );

      const batchResults = await Promise.allSettled(batchPromises);

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          if (result.value.type === 'duplicate') {
            duplicateCount++;
          } else if (result.value.type === 'result' && result.value.data) {
            results.push(result.value.data);
          }
        } else {
          results.push({
            success: false,
            error: `バッチ処理エラー: ${ErrorUtils.getMessage(result.reason, '不明なエラー')}`,
          });
        }
      }
    }

    return { results, duplicateCount };
  }

  /**
   * 単一リポジトリの処理
   * @private
   */
  private static async processRepository(
    repo: GitHubRepository,
    duplicateChecker: (scriptId: string) => Promise<boolean>,
    saveCallback: LibrarySaveWithSummaryCallback,
    generateSummary: boolean,
    config: ScraperConfig
  ): Promise<{ type: 'result' | 'duplicate' | 'skip'; data?: ScrapeResult }> {
    try {
      // スクレイピング実行
      const scrapeResult = await ScrapeGASLibraryService.call(repo.html_url);

      if (!scrapeResult.success || !scrapeResult.data) {
        return {
          type: 'result',
          data: {
            success: false,
            error: `${repo.name}: ${scrapeResult.error || 'スクレイピングに失敗しました'}`,
          },
        };
      }

      const lastCommitAt = new Date(scrapeResult.data.lastCommitAt);

      // 古いコミットはスキップ
      if (this.isCommitTooOld(lastCommitAt)) {
        this.log(
          config,
          `古いコミットのためスキップ: ${repo.name} (最終コミット: ${lastCommitAt.toISOString()})`
        );
        return { type: 'skip' };
      }

      // 重複チェック
      if (scrapeResult.data.scriptId) {
        const isDuplicate = await duplicateChecker(scrapeResult.data.scriptId);
        if (isDuplicate) {
          this.log(config, `重複スキップ: ${repo.name} (Script ID: ${scrapeResult.data.scriptId})`);
          return { type: 'duplicate' };
        }
      }

      // AI要約生成が必要かチェック
      const needsAiSummary = await this.shouldGenerateAiSummary(
        repo.html_url,
        lastCommitAt,
        generateSummary
      );

      if (generateSummary && !needsAiSummary) {
        this.log(
          config,
          `AI要約生成スキップ: ${repo.name} (既存ライブラリで変更なし、AI要約も存在)`
        );
      }

      // データベースに保存
      const saveResult = await saveCallback(scrapeResult.data, needsAiSummary);

      if (!saveResult.success) {
        return {
          type: 'result',
          data: {
            success: false,
            error: `${repo.name}: 保存に失敗 - ${saveResult.error}`,
          },
        };
      }

      // 保存成功時にAI要約生成（必要な場合）
      if (needsAiSummary && saveResult.id) {
        try {
          await GenerateAiSummaryService.call({
            libraryId: saveResult.id,
            githubUrl: repo.html_url,
            skipOnError: true,
            logContext: `バルク処理 AI要約生成[${repo.name}]`,
            verbose: config.verbose,
          });
        } catch (summaryError) {
          this.log(config, `AI要約生成に失敗: ${repo.name} - ${summaryError}`);
          // AI要約生成の失敗は全体の処理失敗とはしない
        }
      }

      this.log(config, `保存完了: ${repo.name} (ID: ${saveResult.id})`);

      return {
        type: 'result',
        data: {
          success: true,
          data: scrapeResult.data,
        },
      };
    } catch (error) {
      return {
        type: 'result',
        data: {
          success: false,
          error: `${repo.name}: ${ErrorUtils.getMessage(error, '処理に失敗しました')}`,
        },
      };
    }
  }

  /**
   * 配列をチャンクに分割するユーティリティ
   * @private
   */
  private static chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
}
