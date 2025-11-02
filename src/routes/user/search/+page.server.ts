import { db } from '$lib/server/db/index.js';
import { library, librarySummary } from '$lib/server/db/schema.js';
import { and, desc, eq, like, or, sql } from 'drizzle-orm';
import type { PageServerLoad } from './$types.js';

// パフォーマンス最適化: 必要最小限のフィールドのみを取得するSELECTクエリ
const optimizedLibrarySelect = {
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
} as const;

// 型推論用のクエリ結果型
type LibraryQueryResult = {
  id: string;
  name: string;
  scriptId: string | null;
  repositoryUrl: string;
  authorUrl: string;
  authorName: string;
  description: string | null;
  licenseType: string | null;
  licenseUrl: string | null;
  starCount: number;
  copyCount: number;
  lastCommitAt: Date | null;
  status: 'pending' | 'published' | 'rejected';
  scriptType: 'library' | 'web_app';
  requesterId: string | null;
  requestNote: string | null;
  createdAt: Date;
  updatedAt: Date;
  summary: {
    id: string;
    libraryId: string;
    tagsJa: string[] | null;
    tagsEn: string[] | null;
    seoDescriptionJa: string | null;
    seoDescriptionEn: string | null;
  } | null;
};

// データ整形ヘルパー関数（重複コード削減）
function formatLibraryData(row: LibraryQueryResult) {
  return {
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
  };
}

export const load: PageServerLoad = async ({ url }) => {
  const searchQuery = url.searchParams.get('q') || '';
  const scriptTypeParam = url.searchParams.get('scriptType');
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const itemsPerPage = 10;
  const offset = (page - 1) * itemsPerPage;

  // scriptTypeのバリデーション
  const validScriptTypes = ['library', 'web_app'] as const;
  const scriptType =
    scriptTypeParam && validScriptTypes.includes(scriptTypeParam as 'library' | 'web_app')
      ? (scriptTypeParam as 'library' | 'web_app')
      : null;

  // 基本条件：公開済みのライブラリのみ
  const baseCondition = eq(library.status, 'published');

  // scriptType条件を追加
  const whereCondition = scriptType
    ? and(baseCondition, eq(library.scriptType, scriptType))
    : baseCondition;

  if (!searchQuery) {
    // 検索クエリがない場合は、公開されているすべてのライブラリを取得
    const [librariesResult, totalCount] = await Promise.all([
      db
        .select(optimizedLibrarySelect)
        .from(library)
        .leftJoin(librarySummary, eq(library.id, librarySummary.libraryId))
        .where(whereCondition)
        .orderBy(desc(library.starCount))
        .limit(itemsPerPage)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(library)
        .where(whereCondition)
        .then(result => result[0]?.count || 0),
    ]);

    return {
      libraries: librariesResult.map(formatLibraryData),
      totalResults: totalCount,
      searchQuery: '',
      scriptType: scriptType || null,
      currentPage: page,
      itemsPerPage,
    };
  }

  // 検索クエリがある場合は、名前、作者名、説明文で検索
  const searchCondition = or(
    like(library.name, `%${searchQuery}%`),
    like(library.authorName, `%${searchQuery}%`),
    like(library.description, `%${searchQuery}%`)
  );

  // 検索クエリがある場合の条件（scriptType条件も含める）
  const searchWithScriptTypeCondition = scriptType
    ? and(whereCondition, searchCondition)
    : and(baseCondition, searchCondition);

  const [librariesResult, totalCount] = await Promise.all([
    db
      .select(optimizedLibrarySelect)
      .from(library)
      .leftJoin(librarySummary, eq(library.id, librarySummary.libraryId))
      .where(searchWithScriptTypeCondition)
      .orderBy(desc(library.starCount))
      .limit(itemsPerPage)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(library)
      .leftJoin(librarySummary, eq(library.id, librarySummary.libraryId))
      .where(searchWithScriptTypeCondition)
      .then(result => result[0]?.count || 0),
  ]);

  return {
    libraries: librariesResult.map(formatLibraryData),
    totalResults: totalCount,
    searchQuery,
    scriptType: scriptType || null,
    currentPage: page,
    itemsPerPage,
  };
};
