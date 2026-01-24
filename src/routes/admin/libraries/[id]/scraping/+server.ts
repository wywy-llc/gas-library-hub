import { UpdateLibraryFromGithubService } from '$lib/server/services/update-library-from-github-service';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';

export const POST: RequestHandler = async ({ params, request }) => {
  const libraryId = params.id;

  if (!libraryId) {
    throw error(400, { message: 'ライブラリIDが指定されていません。' });
  }

  // リクエストボディからオプションを取得（ボディがない場合はデフォルト値）
  let skipAiSummary = true;
  try {
    const body = await request.json();
    skipAiSummary = body.skipAiSummary ?? true;
  } catch {
    // JSONパースエラーの場合はデフォルト値を使用
  }

  try {
    // GitHubからライブラリ情報を更新
    await UpdateLibraryFromGithubService.call(libraryId, { skipAiSummary });

    return json({
      success: true,
      message: 'スクレイピングが完了しました。',
    });
  } catch (err) {
    console.error('スクレイピング処理エラー:', err);
    console.error(
      'エラースタックトレース:',
      err instanceof Error ? err.stack : 'スタックトレース不明'
    );

    throw error(500, {
      message:
        'スクレイピング処理中にエラーが発生しました。しばらく時間をおいて再度お試しください。',
    });
  }
};
