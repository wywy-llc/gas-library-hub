import { json, error } from '@sveltejs/kit';
import { ToggleSampleLikeService } from '$lib/server/services/toggle-sample-like-service.js';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, locals }) => {
  if (!locals.user) {
    throw error(401, 'ログインが必要です');
  }

  try {
    const result = await ToggleSampleLikeService.toggle(locals.user.id, params.id);
    return json(result);
  } catch (e) {
    console.error('Like toggle error:', e);
    throw error(500, 'いいねの処理に失敗しました');
  }
};
