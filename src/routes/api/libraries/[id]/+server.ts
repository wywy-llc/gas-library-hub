import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { GetLibraryApiService } from '$lib/server/services/get-library-api-service.js';
import { createApiErrorResponse, API_CACHE_HEADERS } from '$lib/types/api-response.js';

/**
 * ライブラリ詳細API（公開・認証不要）
 * GET /api/libraries/[id]
 *
 * レスポンス:
 * - 200: ライブラリ詳細情報
 * - 404: ライブラリが見つからない
 * - 500: サーバーエラー
 */
export const GET: RequestHandler = async ({ params }) => {
  const { id } = params;

  try {
    const result = await GetLibraryApiService.call(id);

    if (!result) {
      return json(createApiErrorResponse('NOT_FOUND', `Library not found: ${id}`), {
        status: 404,
        headers: API_CACHE_HEADERS.SHORT,
      });
    }

    return json(result, { headers: API_CACHE_HEADERS.MEDIUM });
  } catch (error) {
    console.error('❌ GET /api/libraries/[id] error:', error);
    return json(createApiErrorResponse('INTERNAL_ERROR', 'An internal error occurred'), {
      status: 500,
    });
  }
};
