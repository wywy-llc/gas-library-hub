/**
 * 型定義の統合エクスポート
 * Drizzleスキーマから直接型を推論し、プロジェクト全体で使用
 */

import type { LibraryStatus } from '$lib/constants/library-status';
import type {
  Library as LibrarySchema,
  Session as SessionSchema,
  User as UserSchema,
} from '$lib/server/db/schema';
import { library, session, user } from '$lib/server/db/schema';

// Drizzleスキーマから推論されるエンティティ型
export type LibraryEntity = Readonly<LibrarySchema>;
export type UserEntity = Readonly<UserSchema>;
export type SessionEntity = Readonly<SessionSchema>;

// ライブラリステータス（constants/library-status.tsから再エクスポート）
export { LIBRARY_STATUS } from '$lib/constants/library-status';
export type { LibraryStatus } from '$lib/constants/library-status';

// 作成・更新用の入力型
export type CreateLibraryInput = Omit<
  typeof library.$inferInsert,
  'id' | 'createdAt' | 'updatedAt'
>;
export type CreateUserInput = Omit<typeof user.$inferInsert, 'id' | 'createdAt'>;
export type CreateSessionInput = typeof session.$inferInsert;

export type UpdateLibraryInput = {
  id: string;
} & Partial<Omit<CreateLibraryInput, 'scriptId'>>;

// 検索・ページネーション関連
export interface LibrarySearchCriteria {
  keyword?: string;
  status?: LibraryStatus;
  author?: string;
  minStarCount?: number;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface LibrarySearchResult {
  libraries: LibraryEntity[];
  pagination: PaginationInfo;
}

// ロケール関連
export type { Locale } from './locale';

// 公開API レスポンス型
export type {
  ApiErrorCode,
  ApiErrorResponse,
  LibrarySummaryApiData,
  LibraryDetailApiData,
  LibraryDetailApiResponse,
  LibraryDetailApiErrorResponse,
  LibrarySearchApiParams,
  LibrarySearchItemApiData,
  LibrarySearchApiResponse,
  LibrarySearchApiErrorResponse,
} from './api-response';

export { createApiErrorResponse, API_CACHE_HEADERS } from './api-response';

// 内部API レスポンス型
export interface BulkRegisterResponse {
  success: boolean;
  message: string;
  summary: {
    total: number;
    successCount: number;
    errorCount: number;
    duplicateCount: number;
    tag: string;
  };
  errors?: string[];
}

/**
 * 使用例:
 *
 * ```typescript
 * import type { LibraryEntity, CreateLibraryInput } from '$lib/types';
 * import { LIBRARY_STATUS } from '$lib/types';
 *
 * // エンティティ使用
 * const library: LibraryEntity = {
 *   id: 'lib_123',
 *   name: 'Test Library',
 *   status: LIBRARY_STATUS.PENDING,
 *   // ... その他のプロパティ（Drizzleスキーマから自動推論）
 * };
 *
 * // 作成用データ
 * const newLibrary: CreateLibraryInput = {
 *   name: 'New Library',
 *   scriptId: 'script_123',
 *   // ... その他の必須フィールド
 * };
 * ```
 */
