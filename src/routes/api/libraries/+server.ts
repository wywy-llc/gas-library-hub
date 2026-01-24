import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { SearchLibrariesApiService } from '$lib/server/services/search-libraries-api-service.js';
import {
  createApiErrorResponse,
  API_CACHE_HEADERS,
  type LibrarySearchApiParams,
} from '$lib/types/api-response.js';

/**
 * ライブラリ検索API（公開・認証不要）
 * GET /api/libraries
 *
 * クエリパラメータ:
 * - q: 検索キーワード
 * - scriptType: library | web_app
 * - tags: カンマ区切りタグ（例: OAuth,認証）
 * - minStars: 最小スター数
 * - page: ページ番号（デフォルト: 1）
 * - limit: 取得件数（デフォルト: 20, 最大: 100）
 * - sort: ソート順（stars | updated | name）
 * - order: 昇順/降順（asc | desc）
 * - locale: 要約言語（ja | en）
 *
 * レスポンス:
 * - 200: 検索結果
 * - 400: パラメータエラー
 * - 500: サーバーエラー
 */
export const GET: RequestHandler = async ({ url }) => {
  try {
    const params = parseSearchParams(url.searchParams);

    const validationError = validateParams(params);
    if (validationError) {
      return json(createApiErrorResponse('INVALID_PARAMS', validationError), { status: 400 });
    }

    const result = await SearchLibrariesApiService.call(params);

    return json(result, { headers: API_CACHE_HEADERS.SHORT });
  } catch (error) {
    console.error('❌ GET /api/libraries error:', error);
    return json(createApiErrorResponse('INTERNAL_ERROR', 'An internal error occurred'), {
      status: 500,
    });
  }
};

/**
 * URLSearchParamsを検索パラメータに変換
 */
function parseSearchParams(searchParams: URLSearchParams): LibrarySearchApiParams {
  const q = searchParams.get('q') || undefined;
  const scriptTypeParam = searchParams.get('scriptType');
  const tags = searchParams.get('tags') || undefined;
  const minStarsParam = searchParams.get('minStars');
  const pageParam = searchParams.get('page');
  const limitParam = searchParams.get('limit');
  const sortParam = searchParams.get('sort');
  const orderParam = searchParams.get('order');
  const localeParam = searchParams.get('locale');

  return {
    q,
    scriptType:
      scriptTypeParam === 'library' || scriptTypeParam === 'web_app' ? scriptTypeParam : undefined,
    tags,
    minStars: minStarsParam ? parseInt(minStarsParam, 10) : undefined,
    page: pageParam ? parseInt(pageParam, 10) : undefined,
    limit: limitParam ? parseInt(limitParam, 10) : undefined,
    sort:
      sortParam === 'stars' || sortParam === 'updated' || sortParam === 'name'
        ? sortParam
        : undefined,
    order: orderParam === 'asc' || orderParam === 'desc' ? orderParam : undefined,
    locale: localeParam === 'ja' || localeParam === 'en' ? localeParam : undefined,
  };
}

/**
 * パラメータバリデーション
 */
function validateParams(params: LibrarySearchApiParams): string | null {
  if (params.page !== undefined && (isNaN(params.page) || params.page < 1)) {
    return 'page must be a positive integer';
  }

  if (params.limit !== undefined && (isNaN(params.limit) || params.limit < 1)) {
    return 'limit must be a positive integer';
  }

  if (params.minStars !== undefined && (isNaN(params.minStars) || params.minStars < 0)) {
    return 'minStars must be a non-negative integer';
  }

  return null;
}
