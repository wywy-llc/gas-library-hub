import { json, error } from '@sveltejs/kit';
import { RecordSampleCopyService } from '$lib/server/services/record-sample-copy-service.js';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, locals, cookies }) => {
  const sessionId = cookies.get('session_id') ?? null;

  try {
    const result = await RecordSampleCopyService.record(
      params.id,
      locals.user?.id ?? null,
      sessionId
    );
    return json(result);
  } catch (e) {
    console.error('Copy record error:', e);
    throw error(500, 'コピーの記録に失敗しました');
  }
};
