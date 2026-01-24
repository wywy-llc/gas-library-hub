import { LIBRARY_STATUS } from '$lib/constants/library-status.js';
import { db } from '$lib/server/db/index.js';
import { library, librarySummary } from '$lib/server/db/schema.js';
import type {
  LibrarySearchApiParams,
  LibrarySearchApiResponse,
  LibrarySearchItemApiData,
} from '$lib/types/api-response.js';
import { and, asc, desc, eq, gte, like, or, sql, type SQL } from 'drizzle-orm';

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;

/**
 * 公開API用ライブラリ検索サービス
 * GET /api/libraries で使用
 */
export const SearchLibrariesApiService = (() => {
  /**
   * 検索条件を構築
   */
  const buildSearchConditions = (params: LibrarySearchApiParams): SQL | undefined => {
    const conditions: SQL[] = [eq(library.status, LIBRARY_STATUS.PUBLISHED)];

    if (params.scriptType) {
      conditions.push(eq(library.scriptType, params.scriptType));
    }

    if (params.minStars !== undefined && params.minStars > 0) {
      conditions.push(gte(library.starCount, params.minStars));
    }

    if (params.q?.trim()) {
      const searchQuery = params.q.trim();
      const searchCondition = or(
        like(library.name, `%${searchQuery}%`),
        like(library.authorName, `%${searchQuery}%`),
        like(library.description, `%${searchQuery}%`)
      );
      if (searchCondition) {
        conditions.push(searchCondition);
      }
    }

    return and(...conditions);
  };

  /**
   * ソート順を構築
   */
  const buildOrderBy = (sort?: string, order?: string) => {
    const orderFn = order === 'asc' ? asc : desc;

    switch (sort) {
      case 'updated':
        return orderFn(library.updatedAt);
      case 'name':
        return orderFn(library.name);
      case 'stars':
      default:
        return orderFn(library.starCount);
    }
  };

  /**
   * API用のライブラリ検索フィールド選択
   */
  const apiLibrarySelect = {
    id: library.id,
    name: library.name,
    scriptId: library.scriptId,
    description: library.description,
    authorName: library.authorName,
    repositoryUrl: library.repositoryUrl,
    starCount: library.starCount,
    scriptType: library.scriptType,
    tagsJa: librarySummary.tagsJa,
    tagsEn: librarySummary.tagsEn,
    purposeJa: librarySummary.purposeJa,
    purposeEn: librarySummary.purposeEn,
  } as const;

  type LibrarySearchRow = {
    id: string;
    name: string;
    scriptId: string | null;
    description: string | null;
    authorName: string | null;
    repositoryUrl: string;
    starCount: number;
    scriptType: 'library' | 'web_app';
    tagsJa: string[] | null;
    tagsEn: string[] | null;
    purposeJa: string | null;
    purposeEn: string | null;
  };

  /**
   * 検索結果をAPI形式に変換
   */
  const formatSearchResult = (
    row: LibrarySearchRow,
    locale: 'ja' | 'en'
  ): LibrarySearchItemApiData => ({
    id: row.id,
    name: row.name,
    scriptId: row.scriptId ?? '',
    description: row.description,
    authorName: row.authorName,
    repositoryUrl: row.repositoryUrl,
    starCount: row.starCount,
    scriptType: row.scriptType,
    tags: (locale === 'ja' ? row.tagsJa : row.tagsEn) ?? [],
    purpose: locale === 'ja' ? row.purposeJa : row.purposeEn,
  });

  /**
   * タグでフィルタリング（JSONB検索の複雑さを避けるためアプリ側で実行）
   */
  const filterByTags = <T extends { tagsJa: string[] | null; tagsEn: string[] | null }>(
    rows: T[],
    tagsParam?: string
  ): T[] => {
    if (!tagsParam) {
      return rows;
    }

    const tagFilters = tagsParam.split(',').map(t => t.trim().toLowerCase());
    return rows.filter(row => {
      const tags = [...(row.tagsJa ?? []), ...(row.tagsEn ?? [])].map(t => t.toLowerCase());
      return tagFilters.some(f => tags.includes(f));
    });
  };

  /**
   * ページネーションパラメータを正規化
   */
  const normalizePageParams = (params: LibrarySearchApiParams) => {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(MAX_LIMIT, Math.max(1, params.limit ?? DEFAULT_LIMIT));
    return { page, limit, offset: (page - 1) * limit };
  };

  return {
    /**
     * ライブラリを検索
     */
    call: async (params: LibrarySearchApiParams): Promise<LibrarySearchApiResponse> => {
      const { page, limit, offset } = normalizePageParams(params);
      const locale = params.locale ?? 'ja';

      const whereCondition = buildSearchConditions(params);
      const orderBy = buildOrderBy(params.sort, params.order);

      const [librariesResult, totalResult] = await Promise.all([
        db
          .select(apiLibrarySelect)
          .from(library)
          .leftJoin(librarySummary, eq(library.id, librarySummary.libraryId))
          .where(whereCondition)
          .orderBy(orderBy)
          .limit(limit)
          .offset(offset),
        db
          .select({ count: sql<number>`count(*)` })
          .from(library)
          .where(whereCondition),
      ]);

      const total = totalResult[0]?.count ?? 0;
      const totalPages = Math.ceil(total / limit);
      const filteredLibraries = filterByTags(librariesResult, params.tags);

      return {
        success: true,
        data: {
          libraries: filteredLibraries.map(row => formatSearchResult(row, locale)),
          pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
          },
        },
        meta: {
          query: params.q ?? null,
          filters: {
            scriptType: params.scriptType ?? null,
            tags: params.tags ? params.tags.split(',').map(t => t.trim()) : [],
            minStars: params.minStars ?? null,
          },
        },
      };
    },
  } as const;
})();
