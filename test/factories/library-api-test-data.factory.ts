import * as Factory from 'factory.ts';
import { createFactoryWrapper, type FactoryWrapper } from './base.factory.js';

/**
 * GetLibraryApiService用DBクエリ結果の型
 * DBから取得した行データをAPI形式に変換する前の型
 */
export interface LibraryDetailDbRow {
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
  // librarySummary fields (leftJoin結果)
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
  mainBenefits: Array<{
    title: { ja: string; en: string };
    description: { ja: string; en: string };
  }> | null;
  usageExample: {
    functions: Array<{ name: string; summary: { ja: string; en: string } }>;
    examples: Array<{
      title: { ja: string; en: string };
      code: string;
      explanation: { ja: string; en: string };
    }>;
  } | null;
  seoTitleJa: string | null;
  seoTitleEn: string | null;
  seoDescriptionJa: string | null;
  seoDescriptionEn: string | null;
}

/**
 * SearchLibrariesApiService用DBクエリ結果の型
 */
export interface LibrarySearchDbRow {
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
}

// ============================================================================
// LibraryDetailDbRow ファクトリ
// ============================================================================

const baseLibraryDetailDbRowFactory = Factory.Sync.makeFactory<LibraryDetailDbRow>({
  id: Factory.each(i => `lib_${i + 1}`),
  name: 'apps-script-oauth2',
  scriptId: '1B7FSrk5Zi6L1rSxxTDgDEUsPzlukDsi4KGuTMorsTQHhGBzBkMun4iDF',
  repositoryUrl: 'https://github.com/googleworkspace/apps-script-oauth2',
  description: 'OAuth2 library for Google Apps Script',
  authorName: 'googleworkspace',
  authorUrl: 'https://github.com/googleworkspace',
  licenseType: 'Apache-2.0',
  licenseUrl: 'https://github.com/googleworkspace/apps-script-oauth2/blob/main/LICENSE',
  starCount: 1500,
  copyCount: 200,
  lastCommitAt: new Date('2024-01-15T10:30:00Z'),
  scriptType: 'library',
  // librarySummary fields
  summaryId: Factory.each(i => `summary_${i + 1}`),
  libraryNameJa: 'OAuth2ライブラリ',
  libraryNameEn: 'OAuth2 Library',
  purposeJa: 'OAuth2認証を簡単に実装',
  purposeEn: 'Easy OAuth2 authentication',
  targetUsersJa: 'GAS開発者',
  targetUsersEn: 'GAS developers',
  tagsJa: ['OAuth2', '認証'],
  tagsEn: ['OAuth2', 'authentication'],
  coreProblemJa: 'OAuth2実装の複雑さ',
  coreProblemEn: 'OAuth2 implementation complexity',
  mainBenefits: [
    {
      title: { ja: '簡単実装', en: 'Easy Implementation' },
      description: { ja: '簡単に認証を追加', en: 'Add auth easily' },
    },
  ],
  usageExample: {
    functions: [{ name: 'OAuth2Service', summary: { ja: '認証サービス', en: 'Auth service' } }],
    examples: [
      {
        title: { ja: '基本的な使い方', en: 'Basic usage' },
        code: 'const auth = OAuth2Service.create();',
        explanation: { ja: '認証サービスを作成', en: 'Create auth service' },
      },
    ],
  },
  seoTitleJa: 'OAuth2ライブラリ - GAS用認証',
  seoTitleEn: 'OAuth2 Library - GAS Auth',
  seoDescriptionJa: 'OAuth2認証を簡単に実装できるライブラリ',
  seoDescriptionEn: 'Library for easy OAuth2 authentication',
});

/**
 * GetLibraryApiService用DBクエリ結果ファクトリ群
 */
export const LibraryDetailDbRowFactories: Record<string, FactoryWrapper<LibraryDetailDbRow>> = {
  /** デフォルト（AI要約付き） */
  default: createFactoryWrapper(baseLibraryDetailDbRowFactory),

  /** AI要約なし */
  withoutSummary: createFactoryWrapper(
    baseLibraryDetailDbRowFactory.extend({
      summaryId: null,
      libraryNameJa: null,
      libraryNameEn: null,
      purposeJa: null,
      purposeEn: null,
      targetUsersJa: null,
      targetUsersEn: null,
      tagsJa: null,
      tagsEn: null,
      coreProblemJa: null,
      coreProblemEn: null,
      mainBenefits: null,
      usageExample: null,
      seoTitleJa: null,
      seoTitleEn: null,
      seoDescriptionJa: null,
      seoDescriptionEn: null,
    })
  ),

  /** 日付なし */
  withoutLastCommit: createFactoryWrapper(
    baseLibraryDetailDbRowFactory.extend({
      lastCommitAt: null,
    })
  ),

  /** web_app型 */
  webApp: createFactoryWrapper(
    baseLibraryDetailDbRowFactory.extend({
      scriptType: 'web_app',
      name: 'gas-web-app',
      description: 'Web App for Google Apps Script',
    })
  ),
};

// ============================================================================
// LibrarySearchDbRow ファクトリ
// ============================================================================

const baseLibrarySearchDbRowFactory = Factory.Sync.makeFactory<LibrarySearchDbRow>({
  id: Factory.each(i => `lib_${i + 1}`),
  name: 'apps-script-oauth2',
  scriptId: '1B7FSrk5Zi6L1rSxxTDgDEUsPzlukDsi4KGuTMorsTQHhGBzBkMun4iDF',
  description: 'OAuth2 library for Google Apps Script',
  authorName: 'googleworkspace',
  repositoryUrl: 'https://github.com/googleworkspace/apps-script-oauth2',
  starCount: 1500,
  scriptType: 'library',
  tagsJa: ['OAuth2', '認証'],
  tagsEn: ['OAuth2', 'authentication'],
  purposeJa: 'OAuth2認証を簡単に実装',
  purposeEn: 'Easy OAuth2 authentication',
});

/**
 * SearchLibrariesApiService用DBクエリ結果ファクトリ群
 */
export const LibrarySearchDbRowFactories: Record<string, FactoryWrapper<LibrarySearchDbRow>> = {
  /** デフォルト */
  default: createFactoryWrapper(baseLibrarySearchDbRowFactory),

  /** OAuth関連 */
  oauth: createFactoryWrapper(
    baseLibrarySearchDbRowFactory.extend({
      name: 'apps-script-oauth2',
      tagsJa: ['OAuth2', '認証'],
      tagsEn: ['OAuth2', 'authentication'],
    })
  ),

  /** スプレッドシート関連 */
  spreadsheet: createFactoryWrapper(
    baseLibrarySearchDbRowFactory.extend({
      id: Factory.each(i => `lib_sheet_${i + 1}`),
      name: 'gas-spreadsheet-helper',
      description: 'Spreadsheet helper for GAS',
      tagsJa: ['スプレッドシート', 'ヘルパー'],
      tagsEn: ['spreadsheet', 'helper'],
      purposeJa: 'スプレッドシート操作を簡単に',
      purposeEn: 'Easy spreadsheet operations',
      starCount: 500,
    })
  ),

  /** タグなし */
  withoutTags: createFactoryWrapper(
    baseLibrarySearchDbRowFactory.extend({
      tagsJa: null,
      tagsEn: null,
    })
  ),

  /** 目的なし */
  withoutPurpose: createFactoryWrapper(
    baseLibrarySearchDbRowFactory.extend({
      purposeJa: null,
      purposeEn: null,
    })
  ),

  /** scriptIdなし */
  withoutScriptId: createFactoryWrapper(
    baseLibrarySearchDbRowFactory.extend({
      scriptId: null,
    })
  ),

  /** web_app型 */
  webApp: createFactoryWrapper(
    baseLibrarySearchDbRowFactory.extend({
      scriptType: 'web_app',
      name: 'gas-web-app',
    })
  ),
};
