import { LIBRARY_STATUS } from '$lib/constants/library-status.js';
import { db } from '$lib/server/db/index.js';
import { library, librarySummary } from '$lib/server/db/schema.js';
import type {
  LibraryDetailApiData,
  LibraryDetailApiResponse,
  LibrarySummaryApiData,
} from '$lib/types/api-response.js';
import { eq, and } from 'drizzle-orm';

/**
 * 公開API用ライブラリ詳細取得サービス
 * GET /api/libraries/[id] で使用
 */
export const GetLibraryApiService = (() => {
  /**
   * DBクエリ用のフィールド選択定義
   */
  const libraryDetailSelect = {
    // library fields
    id: library.id,
    name: library.name,
    scriptId: library.scriptId,
    repositoryUrl: library.repositoryUrl,
    description: library.description,
    authorName: library.authorName,
    authorUrl: library.authorUrl,
    licenseType: library.licenseType,
    licenseUrl: library.licenseUrl,
    starCount: library.starCount,
    copyCount: library.copyCount,
    lastCommitAt: library.lastCommitAt,
    scriptType: library.scriptType,
    // librarySummary fields
    summaryId: librarySummary.id,
    libraryNameJa: librarySummary.libraryNameJa,
    libraryNameEn: librarySummary.libraryNameEn,
    purposeJa: librarySummary.purposeJa,
    purposeEn: librarySummary.purposeEn,
    targetUsersJa: librarySummary.targetUsersJa,
    targetUsersEn: librarySummary.targetUsersEn,
    tagsJa: librarySummary.tagsJa,
    tagsEn: librarySummary.tagsEn,
    coreProblemJa: librarySummary.coreProblemJa,
    coreProblemEn: librarySummary.coreProblemEn,
    mainBenefits: librarySummary.mainBenefits,
    usageExample: librarySummary.usageExample,
    seoTitleJa: librarySummary.seoTitleJa,
    seoTitleEn: librarySummary.seoTitleEn,
    seoDescriptionJa: librarySummary.seoDescriptionJa,
    seoDescriptionEn: librarySummary.seoDescriptionEn,
  } as const;

  type LibraryDetailRow = {
    id: string;
    name: string;
    scriptId: string;
    repositoryUrl: string;
    description: string | null;
    authorName: string | null;
    authorUrl: string | null;
    licenseType: string | null;
    licenseUrl: string | null;
    starCount: number;
    copyCount: number;
    lastCommitAt: Date | null;
    scriptType: 'library' | 'web_app';
    summaryId: string | null;
    libraryNameJa: string | null;
    libraryNameEn: string | null;
    purposeJa: string | null;
    purposeEn: string | null;
    targetUsersJa: string | null;
    targetUsersEn: string | null;
    tagsJa: string[] | null;
    tagsEn: string[] | null;
    coreProblemJa: string | null;
    coreProblemEn: string | null;
    mainBenefits: LibrarySummaryApiData['mainBenefits'];
    usageExample: LibrarySummaryApiData['usageExample'];
    seoTitleJa: string | null;
    seoTitleEn: string | null;
    seoDescriptionJa: string | null;
    seoDescriptionEn: string | null;
  };

  /**
   * DB行からサマリーAPIデータに変換
   */
  const buildSummaryApiData = (row: LibraryDetailRow): LibrarySummaryApiData | null => {
    if (!row.summaryId) {
      return null;
    }

    return {
      libraryName: { ja: row.libraryNameJa, en: row.libraryNameEn },
      purpose: { ja: row.purposeJa, en: row.purposeEn },
      targetUsers: { ja: row.targetUsersJa, en: row.targetUsersEn },
      tags: { ja: row.tagsJa, en: row.tagsEn },
      coreProblem: { ja: row.coreProblemJa, en: row.coreProblemEn },
      mainBenefits: row.mainBenefits,
      usageExample: row.usageExample,
      seo: {
        title: { ja: row.seoTitleJa, en: row.seoTitleEn },
        description: { ja: row.seoDescriptionJa, en: row.seoDescriptionEn },
      },
    };
  };

  /**
   * DB行からライブラリ詳細APIデータに変換
   */
  const buildLibraryDetailApiData = (row: LibraryDetailRow): LibraryDetailApiData => {
    return {
      id: row.id,
      name: row.name,
      scriptId: row.scriptId,
      repositoryUrl: row.repositoryUrl,
      description: row.description,
      authorName: row.authorName,
      authorUrl: row.authorUrl,
      licenseType: row.licenseType,
      licenseUrl: row.licenseUrl,
      starCount: row.starCount,
      copyCount: row.copyCount,
      lastCommitAt: row.lastCommitAt ? row.lastCommitAt.toISOString() : null,
      scriptType: row.scriptType,
      summary: buildSummaryApiData(row),
    };
  };

  return {
    /**
     * ライブラリIDで詳細情報を取得（公開済みのみ）
     * @param libraryId ライブラリID
     * @returns ライブラリ詳細情報またはnull
     */
    call: async (libraryId: string): Promise<LibraryDetailApiResponse | null> => {
      const result = await db
        .select(libraryDetailSelect)
        .from(library)
        .leftJoin(librarySummary, eq(library.id, librarySummary.libraryId))
        .where(and(eq(library.id, libraryId), eq(library.status, LIBRARY_STATUS.PUBLISHED)))
        .limit(1);

      if (result.length === 0) {
        return null;
      }

      return {
        success: true,
        data: buildLibraryDetailApiData(result[0] as LibraryDetailRow),
      };
    },
  } as const;
})();
