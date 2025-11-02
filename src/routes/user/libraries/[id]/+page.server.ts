import { LIBRARY_STATUS } from '$lib/constants/library-status';
import { db } from '$lib/server/db/index.js';
import { library, librarySummary } from '$lib/server/db/schema.js';
import { error } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ params }) => {
  const libraryId = params.id;

  if (!libraryId) {
    error(400, 'ライブラリIDが指定されていません');
  }

  // データベースから公開されているライブラリのみを取得（全カラム選択で最適化）
  const [libraryData] = await db
    .select()
    .from(library)
    .where(and(eq(library.id, libraryId), eq(library.status, LIBRARY_STATUS.PUBLISHED)))
    .limit(1);

  if (!libraryData) {
    error(404, 'ライブラリが見つかりません');
  }

  // ライブラリ要約情報を取得（存在しない場合はnull）
  const summaryResult = await db
    .select()
    .from(librarySummary)
    .where(eq(librarySummary.libraryId, libraryId))
    .limit(1);

  const librarySummaryData = summaryResult.length > 0 ? summaryResult[0] : null;

  return {
    library: libraryData,
    librarySummary: librarySummaryData,
  };
};
