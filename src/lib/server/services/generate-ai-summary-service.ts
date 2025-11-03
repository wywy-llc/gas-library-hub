import { LibrarySummaryRepository } from '$lib/server/repositories/library-summary-repository.js';
import { generateId } from '$lib/server/utils/generate-id.js';
import { GenerateLibrarySummaryService } from './generate-library-summary-service.js';

/**
 * AI要約生成サービス
 */
/**
 * AI要約生成サービスの型定義
 */
type GenerateAiSummaryParams = {
  libraryId: string;
  githubUrl: string;
  skipOnError?: boolean;
  logContext?: string;
  verbose?: boolean;
  enableRetry?: boolean;
  maxRetries?: number;
};

type BatchItem = {
  libraryId: string;
  githubUrl: string;
};

type BatchOptions = {
  skipOnError?: boolean;
  logContext?: string;
  verbose?: boolean;
  enableRetry?: boolean;
  maxRetries?: number;
  concurrency?: number;
};

type BatchResult = {
  succeeded: string[];
  failed: Array<{ libraryId: string; error: string }>;
  total: number;
};

/**
 * AI要約生成サービス
 *
 * バックグラウンド実行と並列処理に対応した高パフォーマンスなサービス
 */
export const GenerateAiSummaryService = (() => {
  /**
   * データ変換ヘルパー：AI要約結果をDB保存用に変換
   */
  const transformSummaryToSaveData = (
    summary: Awaited<ReturnType<typeof GenerateLibrarySummaryService.call>>,
    libraryId: string
  ) => {
    return {
      id: generateId(),
      libraryId,
      // basicInfo → フラット構造に変換
      libraryNameJa: summary.basicInfo.libraryName.ja,
      libraryNameEn: summary.basicInfo.libraryName.en,
      purposeJa: summary.basicInfo.purpose.ja,
      purposeEn: summary.basicInfo.purpose.en,
      targetUsersJa: summary.basicInfo.targetUsers.ja,
      targetUsersEn: summary.basicInfo.targetUsers.en,
      tagsJa: summary.basicInfo.tags.ja,
      tagsEn: summary.basicInfo.tags.en,
      // functionality → フラット構造に変換
      coreProblemJa: summary.functionality.coreProblem.ja,
      coreProblemEn: summary.functionality.coreProblem.en,
      mainBenefits: summary.functionality.mainBenefits,
      usageExampleJa: summary.functionality.usageExample.ja,
      usageExampleEn: summary.functionality.usageExample.en,
      // seoInfo → フラット構造に変換
      seoTitleJa: summary.seoInfo.title.ja,
      seoTitleEn: summary.seoInfo.title.en,
      seoDescriptionJa: summary.seoInfo.description.ja,
      seoDescriptionEn: summary.seoInfo.description.en,
    };
  };

  /**
   * リトライ実行ヘルパー
   */
  const executeWithRetry = async <T>(
    fn: () => Promise<T>,
    maxRetries: number,
    retryDelay = 1000
  ): Promise<T> => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }
        // 指数バックオフで待機
        const delay = retryDelay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    throw new Error('executeWithRetry: Should not reach here');
  };

  /**
   * コア処理：AI要約生成とDB保存
   */
  const processLibrary = async (params: GenerateAiSummaryParams): Promise<void> => {
    const {
      libraryId,
      githubUrl,
      skipOnError = true,
      logContext = 'AI要約生成',
      verbose = false,
      enableRetry = true,
      maxRetries = 2,
    } = params;

    const log = (message: string) => {
      if (verbose) {
        console.log(message);
      }
    };

    try {
      log(`${logContext}開始: libraryId=${libraryId}, githubUrl=${githubUrl}`);

      // AI要約生成（リトライ対応）
      const summaryGenerator = () =>
        GenerateLibrarySummaryService.call({
          githubUrl,
        });

      const summary = enableRetry
        ? await executeWithRetry(summaryGenerator, maxRetries)
        : await summaryGenerator();

      log(`${logContext} - AI要約生成成功: ${libraryId}`);

      // データベースに保存
      const saveData = transformSummaryToSaveData(summary, libraryId);

      log(`${logContext} - データベース保存開始: ${libraryId}`);

      await LibrarySummaryRepository.upsert(libraryId, saveData);

      console.log(`${logContext}完了: ${libraryId}`);
    } catch (error) {
      const errorMessage = `${logContext}に失敗しました: ${error}`;

      console.error(`${logContext}エラー詳細:`, errorMessage);

      if (skipOnError) {
        console.warn(errorMessage);
        // エラーが発生してもメイン処理は続行
      } else {
        console.error(errorMessage);
        throw error;
      }
    }
  };

  return {
    /**
     * AI要約を生成してデータベースに保存
     *
     * 使用例:
     * ```typescript
     * await GenerateAiSummaryService.call({
     *   libraryId: 'lib123',
     *   githubUrl: 'https://github.com/owner/repo',
     *   skipOnError: true,
     *   logContext: 'ライブラリ作成時のAI要約生成'
     * });
     * ```
     *
     * 動作原理:
     * 1. GitHub URLからAI要約を生成
     * 2. 生成された要約をデータベースに保存
     * 3. skipOnErrorがtrueの場合はエラー時も処理を継続
     *
     * @param params 要約生成パラメータ
     */
    call: async (params: GenerateAiSummaryParams): Promise<void> => {
      return processLibrary(params);
    },

    /**
     * バックグラウンドでAI要約を生成（Fire-and-Forget）
     *
     * 使用例:
     * ```typescript
     * GenerateAiSummaryService.callBackground({
     *   libraryId: 'lib123',
     *   githubUrl: 'https://github.com/owner/repo'
     * });
     * // 即座にreturn、処理は裏で継続
     * ```
     *
     * 注意:
     * - 呼び出し元は処理完了を待たない
     * - エラーはログに出力されるが、呼び出し元には通知されない
     * - Vercel Serverless環境では実行時間制限に注意
     *
     * @param params 要約生成パラメータ
     */
    callBackground: (params: GenerateAiSummaryParams): void => {
      processLibrary(params).catch(error => {
        console.error('バックグラウンド処理でエラー発生:', error);
      });
    },

    /**
     * 複数のライブラリを並列でAI要約生成（バッチ処理）
     *
     * 使用例:
     * ```typescript
     * const result = await GenerateAiSummaryService.batch(
     *   [
     *     { libraryId: 'lib1', githubUrl: 'https://github.com/owner/repo1' },
     *     { libraryId: 'lib2', githubUrl: 'https://github.com/owner/repo2' }
     *   ],
     *   { concurrency: 3, verbose: true }
     * );
     * console.log(`成功: ${result.succeeded.length}, 失敗: ${result.failed.length}`);
     * ```
     *
     * 動作原理:
     * 1. Promise.allSettledで全ライブラリを並列実行
     * 2. 個別のエラーは記録し、他の処理は継続
     * 3. 全処理完了後に成功/失敗のサマリーを返却
     *
     * @param items 処理対象のライブラリリスト
     * @param options バッチ処理オプション
     * @returns 処理結果サマリー
     */
    batch: async (items: BatchItem[], options: BatchOptions = {}): Promise<BatchResult> => {
      const {
        skipOnError = true,
        logContext = 'AI要約バッチ生成',
        verbose = false,
        enableRetry = true,
        maxRetries = 2,
      } = options;

      console.log(`${logContext}開始: ${items.length}件のライブラリを処理`);

      const results = await Promise.allSettled(
        items.map(item =>
          processLibrary({
            ...item,
            skipOnError,
            logContext: `${logContext}[${item.libraryId}]`,
            verbose,
            enableRetry,
            maxRetries,
          })
        )
      );

      const succeeded: string[] = [];
      const failed: Array<{ libraryId: string; error: string }> = [];

      results.forEach((result, index) => {
        const item = items[index];
        if (result.status === 'fulfilled') {
          succeeded.push(item.libraryId);
        } else {
          failed.push({
            libraryId: item.libraryId,
            error: result.reason?.message || String(result.reason),
          });
        }
      });

      const summary = {
        succeeded,
        failed,
        total: items.length,
      };

      console.log(
        `${logContext}完了: 成功=${succeeded.length}, 失敗=${failed.length}, 合計=${items.length}`
      );

      if (verbose && failed.length > 0) {
        console.warn('失敗した処理:', failed);
      }

      return summary;
    },
  } as const;
})();
