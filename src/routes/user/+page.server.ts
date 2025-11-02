import { db } from '$lib/server/db';
import { library, librarySummary } from '$lib/server/db/schema';
import { desc, eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  // セッション情報を取得
  const session = await locals.auth();

  // 注目のライブラリとWebアプリを一度のクエリで取得
  const allFeaturedResult = await db
    .select({
      id: library.id,
      name: library.name,
      scriptId: library.scriptId,
      repositoryUrl: library.repositoryUrl,
      authorUrl: library.authorUrl,
      authorName: library.authorName,
      description: library.description,
      licenseType: library.licenseType,
      licenseUrl: library.licenseUrl,
      starCount: library.starCount,
      copyCount: library.copyCount,
      lastCommitAt: library.lastCommitAt,
      status: library.status,
      scriptType: library.scriptType,
      requesterId: library.requesterId,
      requestNote: library.requestNote,
      createdAt: library.createdAt,
      updatedAt: library.updatedAt,
      // 必要なフィールドのみ取得（LibraryCard.svelteで使用される4フィールドのみ）
      summary: {
        id: librarySummary.id,
        libraryId: librarySummary.libraryId,
        tagsJa: librarySummary.tagsJa,
        tagsEn: librarySummary.tagsEn,
        seoDescriptionJa: librarySummary.seoDescriptionJa,
        seoDescriptionEn: librarySummary.seoDescriptionEn,
      },
    })
    .from(library)
    .leftJoin(librarySummary, eq(library.id, librarySummary.libraryId))
    .where(eq(library.status, 'published'))
    .orderBy(desc(library.starCount), desc(library.copyCount))
    .limit(12);

  // データ整形用のヘルパー関数
  const formatLibraryData = (row: (typeof allFeaturedResult)[0]) => ({
    id: row.id,
    name: row.name,
    scriptId: row.scriptId,
    repositoryUrl: row.repositoryUrl,
    authorUrl: row.authorUrl,
    authorName: row.authorName,
    description: row.description,
    licenseType: row.licenseType,
    licenseUrl: row.licenseUrl,
    starCount: row.starCount,
    copyCount: row.copyCount,
    lastCommitAt: row.lastCommitAt,
    status: row.status,
    scriptType: row.scriptType,
    requesterId: row.requesterId,
    requestNote: row.requestNote,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    librarySummary: row.summary?.id ? row.summary : null,
  });

  // scriptType で分離（インメモリフィルタリング）
  const featuredLibraries = allFeaturedResult
    .filter(row => row.scriptType === 'library')
    .slice(0, 6)
    .map(formatLibraryData);

  const featuredWebApps = allFeaturedResult
    .filter(row => row.scriptType === 'web_app')
    .slice(0, 6)
    .map(formatLibraryData);

  return {
    session,
    user: locals.user,
    featuredLibraries,
    featuredWebApps,
  };
};
