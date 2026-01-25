import { db } from '$lib/server/db';
import { library, librarySummary } from '$lib/server/db/schema';
import { SampleCodeRepository } from '$lib/server/repositories/sample-code-repository.js';
import { ToggleSampleLikeService } from '$lib/server/services/toggle-sample-like-service.js';
import { and, desc, eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  // セッション情報を取得
  const session = await locals.auth();

  // 注目のライブラリを取得（Library型のみ）
  // - インデックス (status, scriptType, starCount, copyCount) を活用
  // - 必要なフィールドのみSELECT（LibraryCard.svelteで使用される4フィールドのみ）
  const featuredLibrariesResult = await db
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
      scriptValidationStatus: library.scriptValidationStatus,
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
    .limit(6);

  // データ整形用のヘルパー関数
  const formatLibraryData = (row: (typeof featuredLibrariesResult)[0]) => ({
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
    scriptValidationStatus: row.scriptValidationStatus,
    requesterId: row.requesterId,
    requestNote: row.requestNote,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    librarySummary: row.summary?.id ? row.summary : null,
  });

  // 注目のサンプルコードを取得（いいね数順に6件）
  const { samples: featuredSamples } = await SampleCodeRepository.findPublishedWithPagination({
    limit: 6,
    offset: 0,
    orderBy: 'likeCount',
  });

  // ログインユーザーの場合、いいね状態を取得
  let likedSampleIds = new Set<string>();
  if (locals.user && featuredSamples.length > 0) {
    likedSampleIds = await ToggleSampleLikeService.getLikedSampleIds(
      locals.user.id,
      featuredSamples.map(s => s.id)
    );
  }

  return {
    session,
    user: locals.user,
    featuredLibraries: featuredLibrariesResult.map(formatLibraryData),
    featuredSamples,
    likedSampleIds: Array.from(likedSampleIds),
  };
};
