import { LIBRARY_STATUS, type LibraryStatus } from '$lib/constants/library-status.js';
import { db } from '$lib/server/db/index.js';
import { library, librarySummary } from '$lib/server/db/schema.js';
import { UpdateLibraryFromGithubService } from '$lib/server/services/update-library-from-github-service.js';
import { ActionErrorHandler } from '$lib/server/utils/action-error-handler.js';
import { error, fail } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ params }) => {
  const libraryId = params.id;

  if (!libraryId) {
    throw error(404, 'ライブラリが見つかりません。');
  }

  // ライブラリ情報とサマリーを並列取得（パフォーマンス最適化）
  const [libraryResult, summaryResult] = await Promise.all([
    db
      .select({
        id: library.id,
        name: library.name,
        scriptId: library.scriptId,
        repositoryUrl: library.repositoryUrl,
        authorUrl: library.authorUrl,
        authorName: library.authorName,
        description: library.description,
        starCount: library.starCount,
        copyCount: library.copyCount,
        licenseType: library.licenseType,
        licenseUrl: library.licenseUrl,
        lastCommitAt: library.lastCommitAt,
        status: library.status,
        scriptType: library.scriptType,
        createdAt: library.createdAt,
        updatedAt: library.updatedAt,
      })
      .from(library)
      .where(eq(library.id, libraryId))
      .limit(1),
    db.select().from(librarySummary).where(eq(librarySummary.libraryId, libraryId)).limit(1),
  ]);

  if (libraryResult.length === 0) {
    throw error(404, 'ライブラリが見つかりません。');
  }

  const libraryData = libraryResult[0];
  const librarySummaryData = summaryResult.length > 0 ? summaryResult[0] : null;

  return {
    library: libraryData,
    librarySummary: librarySummaryData,
  };
};

export const actions: Actions = {
  /**
   * ライブラリのステータスを更新する
   * published: 承認して公開
   * pending: 未公開に戻す
   */
  updateStatus: async ({ params, request }) => {
    const libraryId = params.id;

    if (!libraryId) {
      return fail(400, { error: 'ライブラリIDが不正です。' });
    }

    const formData = await request.formData();
    const status = formData.get('status') as string;

    // ステータスのバリデーション
    if (!status || !Object.values(LIBRARY_STATUS).includes(status as LibraryStatus)) {
      return fail(400, { error: '無効なステータスです。' });
    }

    // ライブラリの存在確認
    const existingLibrary = await db
      .select()
      .from(library)
      .where(eq(library.id, libraryId))
      .limit(1);

    if (existingLibrary.length === 0) {
      return fail(404, { error: 'ライブラリが見つかりません。' });
    }

    // ステータスを更新
    await db
      .update(library)
      .set({
        status: status as LibraryStatus,
        updatedAt: new Date(),
      })
      .where(eq(library.id, libraryId));

    // 成功メッセージを返す
    const statusMessages = {
      [LIBRARY_STATUS.PUBLISHED]: 'ライブラリを公開しました。',
      [LIBRARY_STATUS.PENDING]: 'ライブラリを未公開にしました。',
      [LIBRARY_STATUS.REJECTED]: 'ライブラリを却下しました。',
    };

    return {
      success: true,
      message: statusMessages[status as LibraryStatus],
      newStatus: status,
    };
  },

  /**
   * AI要約を再生成する
   */
  generateAiSummary: async ({ params }) => {
    const libraryId = params.id;

    if (!libraryId) {
      return fail(400, { error: 'ライブラリIDが不正です。' });
    }

    try {
      // ライブラリの存在確認
      const existingLibrary = await db
        .select({
          id: library.id,
          name: library.name,
        })
        .from(library)
        .where(eq(library.id, libraryId))
        .limit(1);

      if (existingLibrary.length === 0) {
        return fail(404, { error: 'ライブラリが見つかりません。' });
      }

      const libraryData = existingLibrary[0];

      // AI要約のみを生成
      await UpdateLibraryFromGithubService.generateAiSummaryOnly(libraryId);

      return {
        success: true,
        message: `ライブラリ「${libraryData.name}」のAI要約を再生成しました。`,
      };
    } catch (error) {
      console.error('AI要約生成エラー:', error);
      console.error(
        'エラースタックトレース:',
        error instanceof Error ? error.stack : 'スタックトレース不明'
      );

      return ActionErrorHandler.handleActionErrorWithCustomMessage(
        error,
        'AI要約の生成中にエラーが発生しました。しばらく時間をおいて再度お試しください。',
        'AI要約生成エラー:'
      );
    }
  },

  /**
   * スクレイピングを実行してライブラリ情報を更新する
   */
  runScraping: async ({ params }) => {
    const libraryId = params.id;

    if (!libraryId) {
      return fail(400, { error: 'ライブラリIDが不正です。' });
    }

    try {
      // ライブラリの存在確認
      const existingLibrary = await db
        .select({
          id: library.id,
          name: library.name,
        })
        .from(library)
        .where(eq(library.id, libraryId))
        .limit(1);

      if (existingLibrary.length === 0) {
        return fail(404, { error: 'ライブラリが見つかりません。' });
      }

      const libraryData = existingLibrary[0];

      // スクレイピングを実行してライブラリ情報を更新
      await UpdateLibraryFromGithubService.call(libraryId, { skipAiSummary: true });

      return {
        success: true,
        message: `ライブラリ「${libraryData.name}」の情報を更新しました。スクリプトIDやその他の情報が最新の状態に更新されています。`,
      };
    } catch (error) {
      console.error('スクレイピング実行エラー:', error);
      console.error(
        'エラースタックトレース:',
        error instanceof Error ? error.stack : 'スタックトレース不明'
      );

      return ActionErrorHandler.handleActionErrorWithCustomMessage(
        error,
        'スクレイピングの実行中にエラーが発生しました。しばらく時間をおいて再度お試しください。',
        'スクレイピング実行エラー:'
      );
    }
  },
};
