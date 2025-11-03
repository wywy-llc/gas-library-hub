import { db } from '$lib/server/db';
import { library, librarySummary } from '$lib/server/db/schema';
import { and, desc, eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  // セッション情報を取得
  const session = await locals.auth();

  // パフォーマンス最適化: scriptType別に別々のクエリで並列取得
  // - インデックス (status, scriptType, starCount, copyCount) を活用
  // - 各クエリで正確に6件のみ取得（インメモリフィルタリング不要）
  // - 必要なフィールドのみSELECT（LibraryCard.svelteで使用される4フィールドのみ）
  const [featuredLibrariesResult, featuredWebAppsResult] = await Promise.all([
    // Library型のみ取得
    db
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
        // LibraryCard.svelteで使用される4フィールドのみ
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
      .where(and(eq(library.status, 'published'), eq(library.scriptType, 'library')))
      .orderBy(desc(library.starCount), desc(library.copyCount))
      .limit(6),
    // WebApp型のみ取得
    db
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
        // LibraryCard.svelteで使用される4フィールドのみ
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
      .where(and(eq(library.status, 'published'), eq(library.scriptType, 'web_app')))
      .orderBy(desc(library.starCount), desc(library.copyCount))
      .limit(6),
  ]);

  // データ整形用のヘルパー関数
  const formatLibraryData = (
    row: (typeof featuredLibrariesResult)[0] | (typeof featuredWebAppsResult)[0]
  ) => ({
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

  return {
    session,
    user: locals.user,
    featuredLibraries: featuredLibrariesResult.map(formatLibraryData),
    featuredWebApps: featuredWebAppsResult.map(formatLibraryData),
  };
};
