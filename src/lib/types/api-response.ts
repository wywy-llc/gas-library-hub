/**
 * 公開API レスポンス型定義
 * MCP Server / AI Agent向けエンドポイント用
 */

import type { BilingualText, UsageExampleAnnotated } from './library-summary';

/**
 * API共通エラーコード
 */
export type ApiErrorCode = 'NOT_FOUND' | 'INVALID_PARAMS' | 'INTERNAL_ERROR';

/**
 * API共通エラーレスポンス構造
 */
export interface ApiErrorResponse<T extends ApiErrorCode = ApiErrorCode> {
  success: false;
  error: {
    code: T;
    message: string;
  };
}

/**
 * APIエラーレスポンス生成ヘルパー
 */
export const createApiErrorResponse = <T extends ApiErrorCode>(
  code: T,
  message: string
): ApiErrorResponse<T> => ({
  success: false,
  error: { code, message },
});

/**
 * Cache-Control ヘッダー定数
 */
export const API_CACHE_HEADERS = {
  /** 短期キャッシュ: 1分（クライアント）、5分（CDN） */
  SHORT: { 'Cache-Control': 'public, max-age=60, s-maxage=300' },
  /** 中期キャッシュ: 5分（クライアント）、1時間（CDN） */
  MEDIUM: { 'Cache-Control': 'public, max-age=300, s-maxage=3600' },
  /** 長期キャッシュ: 1時間（クライアント）、24時間（CDN） */
  LONG: { 'Cache-Control': 'public, max-age=3600, s-maxage=86400' },
} as const;

/**
 * ライブラリ要約情報（API用）
 */
export interface LibrarySummaryApiData {
  libraryName: { ja: string | null; en: string | null };
  purpose: { ja: string | null; en: string | null };
  targetUsers: { ja: string | null; en: string | null };
  tags: { ja: string[] | null; en: string[] | null };
  coreProblem: { ja: string | null; en: string | null };
  mainBenefits: Array<{
    title: BilingualText;
    description: BilingualText;
  }> | null;
  usageExample: UsageExampleAnnotated | null;
  seo: {
    title: { ja: string | null; en: string | null };
    description: { ja: string | null; en: string | null };
  };
}

/**
 * ライブラリ詳細APIレスポンス
 * GET /api/libraries/[id]
 */
export interface LibraryDetailApiData {
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
  lastCommitAt: string | null;
  scriptType: 'library' | 'web_app';
  summary: LibrarySummaryApiData | null;
}

export interface LibraryDetailApiResponse {
  success: true;
  data: LibraryDetailApiData;
}

export interface LibraryDetailApiErrorResponse {
  success: false;
  error: {
    code: 'NOT_FOUND' | 'INTERNAL_ERROR';
    message: string;
  };
}

/**
 * ライブラリ検索APIパラメータ
 * GET /api/libraries
 */
export interface LibrarySearchApiParams {
  q?: string;
  scriptType?: 'library' | 'web_app';
  tags?: string;
  minStars?: number;
  page?: number;
  limit?: number;
  sort?: 'stars' | 'updated' | 'name';
  order?: 'asc' | 'desc';
  locale?: 'ja' | 'en';
}

/**
 * 検索結果のライブラリ概要（軽量版）
 */
export interface LibrarySearchItemApiData {
  id: string;
  name: string;
  scriptId: string;
  description: string | null;
  authorName: string | null;
  repositoryUrl: string;
  starCount: number;
  scriptType: 'library' | 'web_app';
  tags: string[];
  purpose: string | null;
}

/**
 * ライブラリ検索APIレスポンス
 * GET /api/libraries
 */
export interface LibrarySearchApiResponse {
  success: true;
  data: {
    libraries: LibrarySearchItemApiData[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  };
  meta: {
    query: string | null;
    filters: {
      scriptType: string | null;
      tags: string[];
      minStars: number | null;
    };
  };
}

export interface LibrarySearchApiErrorResponse {
  success: false;
  error: {
    code: 'INVALID_PARAMS' | 'INTERNAL_ERROR';
    message: string;
  };
}
