import { DEFAULT_GAS_TAGS } from '$lib/constants/scraper-config.js';
import { ActionErrorHandler } from '$lib/server/utils/action-error-handler.js';
import { validateCronAuth } from '$lib/server/utils/api-auth.js';
import { ErrorUtils } from '$lib/server/utils/error-utils.js';
import { json, type RequestHandler } from '@sveltejs/kit';

/**
 * 全タグ一括登録API
 *
 * 使用例:
 * POST /api/cron/bulk-register-all-tags
 * Content-Type: application/json
 *
 * {
 *   "maxPages": 2,
 *   "perPage": 10,
 *   "generateSummary": true
 * }
 *
 * 動作原理:
 * 1. 定義済みのGASタグリストを順次処理
 * 2. 各タグごとに一括登録APIを呼び出し
 * 3. 全体の結果をまとめて返却
 *
 * crontab設定例:
 *
 * # 毎日午前2時に全タグで一括登録（推奨）
 * 0 2 * * * /usr/bin/curl -X POST http://localhost:5173/api/cron/bulk-register-all-tags -H "Content-Type: application/json" -H "Authorization: Bearer YOUR_AUTH_SECRET" -d '{"maxPages":2,"perPage":10,"generateSummary":true}' >> /var/log/gas-library-all-tags-cron.log 2>&1
 *
 * # 毎週日曜日午前1時に全タグで大規模一括登録（週1回）
 * 0 1 * * 0 /usr/bin/curl -X POST http://localhost:5173/api/cron/bulk-register-all-tags -H "Content-Type: application/json" -H "Authorization: Bearer YOUR_AUTH_SECRET" -d '{"maxPages":5,"perPage":20,"generateSummary":true}' >> /var/log/gas-library-all-tags-weekly.log 2>&1
 *
 * # 平日のみ午前3時に軽量実行（業務日対応）
 * 0 3 * * 1-5 /usr/bin/curl -X POST http://localhost:5173/api/cron/bulk-register-all-tags -H "Content-Type: application/json" -H "Authorization: Bearer YOUR_AUTH_SECRET" -d '{"maxPages":1,"perPage":5,"generateSummary":false}' >> /var/log/gas-library-weekday-cron.log 2>&1
 *
 *
 * 処理対象タグ（順次実行）:
 * 1. google-apps-script  - 最重要タグ
 * 2. google-sheets       - スプレッドシート連携
 * 3. apps-script         - 短縮形
 * 4. library             - ライブラリ専用
 * 5. gas                 - 略称
 * 6. google-workspace    - ビジネス向け
 * 7. gmail               - メール自動化
 * 8. google-drive        - ファイル操作
 * 9. developer-tools     - 開発ツール
 * 10. javascript         - 技術スタック
 *
 * 実行時間目安:
 * - maxPages=2, perPage=10: 約10-15分（10タグ × 2ページ × タグ間2秒待機）
 * - maxPages=5, perPage=20: 約20-30分（大規模実行）
 * - GitHub APIレート制限により調整される場合があります
 *
 * 推奨設定:
 * - 毎日実行する場合は maxPages=2, perPage=10 が適切
 * - 週1回の大規模実行と日次の軽量実行を組み合わせると効果的
 * - ログ監視により API レート制限エラーを検知
 * - 深夜時間帯での実行でサーバー負荷を分散
 */

// ─── 定数 ───
const DEFAULT_MAX_PAGES = 2;
const DEFAULT_PER_PAGE = 10;
const TAG_PROCESSING_DELAY_MS = 2000;

// ─── 公開インターフェース ───
interface BatchRegisterRequest {
  maxPages?: number;
  perPage?: number;
  generateSummary?: boolean;
  tags?: string[];
}

interface TagResult {
  tag: string;
  success: boolean;
  total: number;
  successCount: number;
  errorCount: number;
  duplicateCount: number;
  errors?: string[];
}

interface OverallResults {
  totalTags: number;
  successTags: number;
  failedTags: number;
  totalLibraries: number;
  totalSuccess: number;
  totalErrors: number;
  totalDuplicates: number;
}

interface BatchRegisterResponse {
  success: boolean;
  message: string;
  overallResults: OverallResults;
  tagResults: TagResult[];
}

// ─── 内部インターフェース ───
interface ParsedConfig {
  maxPages: number;
  perPage: number;
  generateSummary: boolean;
  tags: readonly string[];
}

/**
 * 内部APIレスポンスの期待される形式
 * /api/libraries/bulk-register からのレスポンス
 */
interface InternalBulkRegisterResponse {
  success: boolean;
  summary: {
    total: number;
    successCount: number;
    errorCount: number;
    duplicateCount: number;
  };
  errors?: string[];
}

// ─── ヘルパー関数 ───

async function parseRequest(request: Request): Promise<ParsedConfig> {
  let body: BatchRegisterRequest;
  try {
    body = (await request.json()) as BatchRegisterRequest;
  } catch {
    // JSON解析失敗時はデフォルト値を使用
    body = {};
  }

  return {
    maxPages: body.maxPages ?? DEFAULT_MAX_PAGES,
    perPage: body.perPage ?? DEFAULT_PER_PAGE,
    generateSummary: body.generateSummary !== false,
    tags: body.tags ?? DEFAULT_GAS_TAGS,
  };
}

async function processAllTags(
  tags: readonly string[],
  config: ParsedConfig,
  request: Request,
  fetch: typeof globalThis.fetch
): Promise<TagResult[]> {
  const results: TagResult[] = [];

  for (const [index, tag] of tags.entries()) {
    const result = await processSingleTag(tag, index, tags.length, config, request, fetch);
    results.push(result);

    if (index < tags.length - 1) {
      await delay(TAG_PROCESSING_DELAY_MS);
    }
  }

  return results;
}

async function processSingleTag(
  tag: string,
  index: number,
  totalTags: number,
  config: ParsedConfig,
  request: Request,
  fetch: typeof globalThis.fetch
): Promise<TagResult> {
  console.log(`📋 処理中: ${tag} (${index + 1}/${totalTags})`);

  try {
    const response = await fetch('/api/libraries/bulk-register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: request.headers.get('Authorization') ?? '',
      },
      body: JSON.stringify({
        tags: [tag],
        maxPages: config.maxPages,
        perPage: config.perPage,
        generateSummary: config.generateSummary,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = (await response.json()) as InternalBulkRegisterResponse;

    // レスポンス検証: summaryが存在しない場合はエラー扱い
    if (!result.summary) {
      throw new Error('内部APIからの不正なレスポンス: summary が存在しません');
    }

    console.log(
      `✅ ${tag}完了: 成功=${result.summary.successCount}件, エラー=${result.summary.errorCount}件`
    );

    return {
      tag,
      success: result.success,
      total: result.summary.total,
      successCount: result.summary.successCount,
      errorCount: result.summary.errorCount,
      duplicateCount: result.summary.duplicateCount,
      errors: result.errors,
    };
  } catch (error) {
    console.error(`❌ ${tag}でエラー:`, error);

    return {
      tag,
      success: false,
      total: 0,
      successCount: 0,
      errorCount: 1,
      duplicateCount: 0,
      errors: [ErrorUtils.getMessage(error, '不明なエラー')],
    };
  }
}

function aggregateResults(tagResults: TagResult[], totalTags: number): OverallResults {
  let successTags = 0;
  let totalLibraries = 0;
  let totalSuccess = 0;
  let totalErrors = 0;
  let totalDuplicates = 0;

  for (const r of tagResults) {
    if (r.success) successTags++;
    totalLibraries += r.total;
    totalSuccess += r.successCount;
    totalErrors += r.errorCount;
    totalDuplicates += r.duplicateCount;
  }

  return {
    totalTags,
    successTags,
    failedTags: totalTags - successTags,
    totalLibraries,
    totalSuccess,
    totalErrors,
    totalDuplicates,
  };
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export const POST: RequestHandler = async ({ request, fetch }) => {
  try {
    validateCronAuth(request);

    const config = await parseRequest(request);
    const { tags, maxPages, perPage } = config;

    console.log(
      `🚀 全タグ一括登録開始: ${tags.length}タグ, maxPages=${maxPages}, perPage=${perPage}`
    );

    const tagResults = await processAllTags(tags, config, request, fetch);
    const overallResults = aggregateResults(tagResults, tags.length);
    const successTags = overallResults.successTags;

    console.log(
      `🎉 全タグ一括登録完了: ${successTags}/${tags.length}タグ成功, 合計${overallResults.totalSuccess}件登録`
    );

    return json({
      success: successTags > 0,
      message: `全タグ処理完了: ${successTags}/${tags.length}タグ成功、合計${overallResults.totalSuccess}件のライブラリを登録`,
      overallResults,
      tagResults,
    } satisfies BatchRegisterResponse);
  } catch (error) {
    return ActionErrorHandler.handleBatchRegisterError(error, '全タグ一括登録APIエラー:');
  }
};
