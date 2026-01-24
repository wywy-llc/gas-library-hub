/**
 * バリデーション付きライブラリ要約生成サービス
 *
 * ソースコード分析 + AI生成 + バリデーション + 自動再生成を統合する。
 * ハルシネーション（存在しないメソッドの創作）を防止する。
 */

import {
  buildLibrarySummaryPrompt,
  buildLibrarySummaryPromptWithSource,
  buildRegenerationPrompt,
  LIBRARY_SUMMARY_JSON_SCHEMA,
} from '$lib/server/prompts/library-summary-prompt.js';
import { SourceCodeAnalyzerService } from '$lib/server/services/source-code-analyzer-service.js';
import { UsageExampleValidatorService } from '$lib/server/services/usage-example-validator-service.js';
import { GitHubApiUtils } from '$lib/server/utils/github-api-utils.js';
import { RateLimitUtil } from '$lib/server/utils/rate-limit-util.js';
import { XaiUtils } from '$lib/server/utils/xai-utils.js';
import type { LibrarySummary } from '$lib/types/library-summary.js';
import type {
  PublicApi,
  RepositoryAnalysis,
  ValidationError,
  ValidationResult,
} from '$lib/types/source-analysis.js';

/**
 * 生成オプション
 */
export interface GenerationOptions {
  /** ソースコード分析を有効にするか（デフォルト: true） */
  enableSourceAnalysis?: boolean;
  /** バリデーションを有効にするか（デフォルト: true） */
  enableValidation?: boolean;
  /** 最大再生成回数（デフォルト: 3） */
  maxAttempts?: number;
  /** 詳細ログを出力するか（デフォルト: false） */
  verbose?: boolean;
}

/**
 * 検証済み要約生成結果
 */
export interface ValidatedSummaryResult {
  /** 生成されたライブラリ要約 */
  summary: LibrarySummary;
  /** バリデーション結果（バリデーション無効時はundefined） */
  validationResult?: ValidationResult;
  /** 生成試行回数 */
  attempts: number;
  /** ソースコード分析結果（分析無効時はundefined） */
  sourceAnalysis?: RepositoryAnalysis;
}

/**
 * 最大再生成回数
 */
const DEFAULT_MAX_ATTEMPTS = 3;

/**
 * API呼び出しリトライ設定
 */
const API_RETRY_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 1000,
} as const;

/**
 * レート制限エラー時のバックオフ設定
 */
const RATE_LIMIT_BACKOFF_CONFIG = {
  baseDelayMs: 2000,
  maxDelayMs: 30000,
} as const;

/** バリデーション可能な分析結果の型 */
type ValidatedAnalysis = RepositoryAnalysis & {
  success: true;
  publicApis: PublicApi[];
};

/**
 * 分析結果がバリデーション可能かを判定（Type Guard）
 */
const hasValidPublicApis = (
  analysis: RepositoryAnalysis | undefined
): analysis is ValidatedAnalysis => {
  return Boolean(analysis?.success && analysis.publicApis && analysis.publicApis.length > 0);
};

/**
 * レート制限エラーかどうかを判定
 */
const isRateLimitError = (error: unknown): boolean => {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('rate limit') ||
      message.includes('429') ||
      message.includes('too many requests')
    );
  }
  return false;
};

export const ValidatedSummaryGeneratorService = (() => {
  /**
   * ソースコード分析を実行
   */
  const analyzeSourceCode = async (
    enableSourceAnalysis: boolean,
    owner: string,
    repo: string,
    log: (msg: string) => void
  ): Promise<{ analysis: RepositoryAnalysis | undefined; sourceSummary: string }> => {
    if (!enableSourceAnalysis) {
      return { analysis: undefined, sourceSummary: '' };
    }

    log('ソースコード分析を開始...');
    const analysis = await SourceCodeAnalyzerService.analyzeRepository(owner, repo);

    if (hasValidPublicApis(analysis)) {
      const sourceSummary = SourceCodeAnalyzerService.generateSourceSummary(analysis);
      log(`公開API ${analysis.publicApis!.length}件を抽出`);
      return { analysis, sourceSummary };
    }

    log(`ソースコード分析失敗または公開APIなし: ${analysis.error || '不明'}`);
    return { analysis, sourceSummary: '' };
  };

  /**
   * README セクションを取得
   */
  const fetchReadmeSection = async (owner: string, repo: string): Promise<string> => {
    const readme = await GitHubApiUtils.fetchReadme(owner, repo);
    return readme
      ? `\n\n---\n\n## README.md Content\n\n${readme}\n\n---`
      : '\n\n---\n\n## README.md Content\n\nREADME.mdが見つかりません。\n\n---';
  };
  /**
   * バリデーション付きでライブラリ要約を生成
   * @param githubUrl GitHubリポジトリのURL
   * @param options 生成オプション
   * @returns 検証済み要約生成結果
   */
  const call = async (
    githubUrl: string,
    options: GenerationOptions = {}
  ): Promise<ValidatedSummaryResult> => {
    const {
      enableSourceAnalysis = true,
      enableValidation = true,
      maxAttempts = DEFAULT_MAX_ATTEMPTS,
      verbose = false,
    } = options;

    const log = (msg: string) => verbose && console.log(`[ValidatedSummary] ${msg}`);

    // GitHub URL解析
    const parsed = GitHubApiUtils.parseGitHubUrl(githubUrl);
    if (!parsed) {
      throw new Error('無効なGitHub URLです');
    }
    const { owner, repo } = parsed;

    // Step 1: ソースコード分析（オプション）
    const { analysis, sourceSummary } = await analyzeSourceCode(
      enableSourceAnalysis,
      owner,
      repo,
      log
    );

    // Step 2: README取得
    log('README取得...');
    const readmeSection = await fetchReadmeSection(owner, repo);

    // Step 3: 生成→検証ループ
    let attempts = 0;
    let lastValidationResult: ValidationResult | undefined;
    let lastSummary: LibrarySummary | undefined;

    // ベースプロンプトを保持（累積問題を防止）
    const basePrompt = sourceSummary
      ? buildLibrarySummaryPromptWithSource(githubUrl, sourceSummary)
      : buildLibrarySummaryPrompt(githubUrl);

    // 累積エラーを追跡
    let accumulatedErrors: ValidationError[] = [];

    while (attempts < maxAttempts) {
      attempts++;
      log(`生成試行 ${attempts}/${maxAttempts}...`);

      // 累積エラーでプロンプト構築（basePromptから毎回構築）
      const currentPrompt =
        accumulatedErrors.length > 0
          ? buildRegenerationPrompt(basePrompt, accumulatedErrors)
          : basePrompt;

      // AI生成
      try {
        const summary = await generateSummaryWithPrompt(currentPrompt + readmeSection);
        lastSummary = summary;

        // バリデーション（オプション）
        if (enableValidation && hasValidPublicApis(analysis)) {
          log('バリデーション実行...');
          const validationResult = UsageExampleValidatorService.validate(
            summary.functionality.usageExample,
            analysis!.publicApis!
          );
          lastValidationResult = validationResult;

          if (validationResult.isValid) {
            log('バリデーション成功');
            return {
              summary,
              validationResult,
              attempts,
              sourceAnalysis: analysis,
            };
          }

          log(`バリデーション失敗: ${validationResult.errors.length}件のエラー`);
          validationResult.errors.forEach(e =>
            log(`  - [${e.language}] ${e.invalidCall}: ${e.message}`)
          );

          // 累積エラーを更新（重複を除外）
          const existingCalls = new Set(accumulatedErrors.map(e => e.invalidCall));
          const newErrors = validationResult.errors.filter(e => !existingCalls.has(e.invalidCall));
          accumulatedErrors = [...accumulatedErrors, ...newErrors];

          if (attempts < maxAttempts) {
            log('再生成を試行...');
            continue;
          }
        } else {
          // バリデーション無効または分析失敗時はそのまま返却
          log('バリデーションスキップ（分析失敗またはバリデーション無効）');
          return {
            summary,
            validationResult: undefined,
            attempts,
            sourceAnalysis: analysis,
          };
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        log(`生成エラー: ${errorMessage}`);

        // エラー種別に応じた処理
        if (isRateLimitError(error)) {
          log('レート制限エラー - 待機後に再試行...');
          await RateLimitUtil.exponentialBackoff(
            attempts - 1,
            RATE_LIMIT_BACKOFF_CONFIG.baseDelayMs,
            RATE_LIMIT_BACKOFF_CONFIG.maxDelayMs
          );
        }

        if (attempts >= maxAttempts) {
          throw error;
        }
        continue;
      }
    }

    // 最大試行回数に達した場合
    if (lastSummary) {
      log(`最大試行回数に達しました（${maxAttempts}回）- 最後の結果を返却`);
      return {
        summary: lastSummary,
        validationResult: lastValidationResult,
        attempts,
        sourceAnalysis: analysis,
      };
    }

    throw new Error(`要約生成に${maxAttempts}回失敗しました`);
  };

  /**
   * プロンプトからAI要約を生成（内部ヘルパー）
   * 指数バックオフ付きリトライ機能を含む
   * @param fullPrompt 完全なプロンプト
   * @returns ライブラリ要約
   */
  const generateSummaryWithPrompt = async (fullPrompt: string): Promise<LibrarySummary> => {
    const client = XaiUtils.getClient();

    // 外部API呼び出しに指数バックオフ付きリトライを適用（プロジェクト規約準拠）
    const response = await RateLimitUtil.withRetry(
      () =>
        client.chat.completions.create({
          model: 'grok-4-1-fast-reasoning',
          messages: [{ role: 'user', content: fullPrompt }],
          response_format: {
            type: 'json_schema',
            json_schema: LIBRARY_SUMMARY_JSON_SCHEMA,
          },
        }),
      API_RETRY_CONFIG.maxRetries,
      API_RETRY_CONFIG.baseDelayMs
    );

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('xAI Grok API からの応答が空です');
    }

    try {
      return JSON.parse(content) as LibrarySummary;
    } catch {
      throw new Error('xAI Grok API からの応答をJSONとして解析できませんでした');
    }
  };

  return {
    call,
  } as const;
})();
