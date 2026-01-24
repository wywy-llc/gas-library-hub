import { describe, expect, it } from 'vitest';
import { APP_CONFIG } from '../../../../../../src/lib/constants/app-config';
import type { Library, LibrarySummaryRecord } from '../../../../../../src/lib/server/db/schema';

// JSON-LD生成関数のテスト用実装
function generateKeywords(
  librarySummary: LibrarySummaryRecord | null,
  currentLocale: string
): string {
  const baseKeywords = ['JavaScript', 'Google Apps Script'];
  let additionalKeywords: string[] = [];

  if (librarySummary) {
    if (currentLocale === 'ja' && librarySummary.tagsJa) {
      additionalKeywords = librarySummary.tagsJa;
    } else if (currentLocale === 'en' && librarySummary.tagsEn) {
      additionalKeywords = librarySummary.tagsEn;
    }
  }

  // 重複を除去してキーワードを結合
  const allKeywords = [...baseKeywords, ...additionalKeywords];
  const uniqueKeywords = [...new Set(allKeywords)];
  return uniqueKeywords.join(', ');
}

function generateJsonLd(
  library: Library,
  librarySummary: LibrarySummaryRecord | null,
  currentLocale: string
) {
  const baseUrl = APP_CONFIG.BASE_URL;
  const pageUrl = `${baseUrl}/user/libraries/${library.id}`;

  // SEO用のtitleとdescriptionを動的に取得
  const getSeoTitle = () => {
    if (!librarySummary) return `${library.name} - GAS Library Hub`;

    if (currentLocale === 'ja' && librarySummary.seoTitleJa) {
      return librarySummary.seoTitleJa;
    } else if (currentLocale === 'en' && librarySummary.seoTitleEn) {
      return librarySummary.seoTitleEn;
    }

    return `${library.name} - GAS Library Hub`;
  };

  const getSeoDescription = () => {
    if (!librarySummary) return library.description;

    if (currentLocale === 'ja' && librarySummary.seoDescriptionJa) {
      return librarySummary.seoDescriptionJa;
    } else if (currentLocale === 'en' && librarySummary.seoDescriptionEn) {
      return librarySummary.seoDescriptionEn;
    }

    return library.description;
  };

  // 会社名をロケールに応じて取得
  const getCompanyName = () => {
    return currentLocale === 'ja' ? 'wywy合同会社' : 'wywy LLC';
  };

  // Software Source Code Schema
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareSourceCode',
    name: getSeoTitle(),
    description: getSeoDescription(),
    url: pageUrl,
    programmingLanguage: 'JavaScript',
    runtimePlatform: 'Google Apps Script',
    codeRepository: library.repositoryUrl,
    author: {
      '@type': 'Person',
      name: library.authorName,
      url: library.authorUrl,
    },
    license: library.licenseUrl,
    dateModified: library.lastCommitAt.toISOString(),
    ...(library.starCount && {
      interactionStatistic: {
        '@type': 'InteractionCounter',
        interactionType: 'https://schema.org/LikeAction',
        userInteractionCount: library.starCount,
      },
    }),
    keywords: generateKeywords(librarySummary, currentLocale),
    publisher: {
      '@type': 'Organization',
      name: getCompanyName(),
      url: 'https://wywy.jp/',
    },
  };

  return jsonLd;
}

describe('JSON-LD構造化データ', () => {
  const mockLibrary: Library = {
    id: 'test-library-id',
    name: 'Test Library',
    scriptId: 'test-script-id',
    repositoryUrl: 'https://github.com/test/repo',
    authorUrl: 'https://github.com/test',
    authorName: 'Test Author',
    description: 'Test library description',
    starCount: 100,
    copyCount: 50,
    licenseType: 'MIT',
    licenseUrl: 'https://opensource.org/licenses/MIT',
    lastCommitAt: new Date('2023-01-01'),
    status: 'published' as const,
    scriptType: 'library' as const,
    requesterId: null,
    requestNote: null,
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
  };

  const mockLibrarySummary: LibrarySummaryRecord = {
    id: 'summary-id',
    libraryId: 'test-library-id',
    libraryNameJa: 'テストライブラリ',
    libraryNameEn: 'Test Library',
    purposeJa: 'テスト用途',
    purposeEn: 'Testing purpose',
    targetUsersJa: 'テストユーザー',
    targetUsersEn: 'Test users',
    tagsJa: ['テスト', 'ライブラリ'],
    tagsEn: ['test', 'library'],
    coreProblemJa: 'テスト問題',
    coreProblemEn: 'Test problem',
    mainBenefits: [],
    usageExampleJa: '',
    usageExampleEn: '',
    usageExample: {
      functions: [{ name: 'testFunction', summary: { ja: 'テスト関数', en: 'Test function' } }],
      examples: [
        {
          title: { ja: 'テスト使用例', en: 'Test usage example' },
          code: 'testFunction();',
          explanation: { ja: 'テスト', en: 'Test' },
        },
      ],
    },
    seoTitleJa: 'テストライブラリ - GAS Library Hub',
    seoTitleEn: 'Test Library - GAS Library Hub',
    seoDescriptionJa: 'テストライブラリの説明',
    seoDescriptionEn: 'Test library description',
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
  };

  it('日本語ロケールでJSON-LDが正しく生成される', () => {
    const jsonLdContent = generateJsonLd(mockLibrary, mockLibrarySummary, 'ja');

    // 基本構造の確認
    expect(jsonLdContent['@context']).toBe('https://schema.org');
    expect(jsonLdContent['@type']).toBe('SoftwareSourceCode');
    expect(jsonLdContent.name).toBe('テストライブラリ - GAS Library Hub');
    expect(jsonLdContent.description).toBe('テストライブラリの説明');

    // SoftwareSourceCode特有のプロパティ確認
    expect(jsonLdContent.programmingLanguage).toBe('JavaScript');
    expect(jsonLdContent.runtimePlatform).toBe('Google Apps Script');
    expect(jsonLdContent.codeRepository).toBe('https://github.com/test/repo');

    // キーワードの重複排除確認
    const keywords = jsonLdContent.keywords.split(', ');
    const uniqueKeywords = [...new Set(keywords)];
    expect(keywords).toEqual(uniqueKeywords); // 重複がないことを確認

    // 日本語タグが含まれていることを確認
    expect(jsonLdContent.keywords).toContain('テスト');
    expect(jsonLdContent.keywords).toContain('ライブラリ');
    expect(jsonLdContent.keywords).toContain('JavaScript');
    expect(jsonLdContent.keywords).toContain('Google Apps Script');

    // その他のプロパティ確認
    expect(jsonLdContent.url).toBe(`${APP_CONFIG.BASE_URL}/user/libraries/test-library-id`);
    expect(jsonLdContent.author.name).toBe('Test Author');
    expect(jsonLdContent.interactionStatistic?.userInteractionCount).toBe(100);

    // 日本語ロケールでの会社名確認
    expect(jsonLdContent.publisher.name).toBe('wywy合同会社');
  });

  it('英語ロケールでJSON-LDが正しく生成される', () => {
    const jsonLdContent = generateJsonLd(mockLibrary, mockLibrarySummary, 'en');

    // 英語コンテンツの確認
    expect(jsonLdContent.name).toBe('Test Library - GAS Library Hub');
    expect(jsonLdContent.description).toBe('Test library description');

    // SoftwareSourceCode特有のプロパティ確認
    expect(jsonLdContent['@type']).toBe('SoftwareSourceCode');
    expect(jsonLdContent.programmingLanguage).toBe('JavaScript');
    expect(jsonLdContent.runtimePlatform).toBe('Google Apps Script');
    expect(jsonLdContent.codeRepository).toBe('https://github.com/test/repo');

    // 英語タグが含まれていることを確認
    expect(jsonLdContent.keywords).toContain('test');
    expect(jsonLdContent.keywords).toContain('library');
    expect(jsonLdContent.keywords).toContain('JavaScript');
    expect(jsonLdContent.keywords).toContain('Google Apps Script');

    // キーワードの重複排除確認
    const keywords = jsonLdContent.keywords.split(', ');
    const uniqueKeywords = [...new Set(keywords)];
    expect(keywords).toEqual(uniqueKeywords);

    // 英語ロケールでの会社名確認
    expect(jsonLdContent.publisher.name).toBe('wywy LLC');
  });

  it('librarySummaryがない場合にフォールバック値が使用される', () => {
    const jsonLdContent = generateJsonLd(mockLibrary, null, 'ja');

    // フォールバック値の確認
    expect(jsonLdContent.name).toBe('Test Library - GAS Library Hub');
    expect(jsonLdContent.description).toBe('Test library description');
    expect(jsonLdContent.keywords).toBe('JavaScript, Google Apps Script');

    // 日本語ロケールでの会社名確認（フォールバック時も適用）
    expect(jsonLdContent.publisher.name).toBe('wywy合同会社');
  });

  it('キーワードに重複がある場合に正しく除去される', () => {
    // 重複キーワードを含むモックデータ
    const summaryWithDuplicates: LibrarySummaryRecord = {
      ...mockLibrarySummary,
      tagsJa: ['JavaScript', 'Google Apps Script', 'テスト', 'JavaScript'], // 重複あり
    };

    const jsonLdContent = generateJsonLd(mockLibrary, summaryWithDuplicates, 'ja');
    const keywords = jsonLdContent.keywords.split(', ');

    // JavaScriptとGoogle Apps Scriptが1回ずつしか含まれていないことを確認
    const jsCount = keywords.filter((k: string) => k === 'JavaScript').length;
    const gasCount = keywords.filter((k: string) => k === 'Google Apps Script').length;

    expect(jsCount).toBe(1);
    expect(gasCount).toBe(1);

    // 全体の重複チェック
    const uniqueKeywords = [...new Set(keywords)];
    expect(keywords).toEqual(uniqueKeywords);
  });

  it('starCountが0の場合にinteractionStatisticが含まれない', () => {
    const libraryWithoutStars = {
      ...mockLibrary,
      starCount: 0,
    };

    const jsonLdContent = generateJsonLd(libraryWithoutStars, mockLibrarySummary, 'ja');

    // interactionStatisticが含まれていないことを確認
    expect(jsonLdContent.interactionStatistic).toBeUndefined();
  });

  it('generateKeywords関数単体のテスト', () => {
    // 日本語ロケールでの重複排除テスト
    const summaryWithDuplicates: LibrarySummaryRecord = {
      ...mockLibrarySummary,
      tagsJa: ['JavaScript', 'テスト', 'Google Apps Script', 'ライブラリ', 'JavaScript'],
    };

    const keywords = generateKeywords(summaryWithDuplicates, 'ja');
    const keywordArray = keywords.split(', ');

    // 重複がないことを確認
    const uniqueKeywords = [...new Set(keywordArray)];
    expect(keywordArray).toEqual(uniqueKeywords);

    // 期待するキーワードが含まれていることを確認
    expect(keywords).toContain('JavaScript');
    expect(keywords).toContain('Google Apps Script');
    expect(keywords).toContain('テスト');
    expect(keywords).toContain('ライブラリ');

    // JavaScriptが1回だけ含まれていることを確認
    const jsCount = keywordArray.filter(k => k === 'JavaScript').length;
    expect(jsCount).toBe(1);
  });

  it('英語タグで重複排除が正しく動作する', () => {
    const summaryWithDuplicates: LibrarySummaryRecord = {
      ...mockLibrarySummary,
      tagsEn: ['JavaScript', 'test', 'Google Apps Script', 'library', 'test'],
    };

    const keywords = generateKeywords(summaryWithDuplicates, 'en');
    const keywordArray = keywords.split(', ');

    // 重複がないことを確認
    const uniqueKeywords = [...new Set(keywordArray)];
    expect(keywordArray).toEqual(uniqueKeywords);

    // testが1回だけ含まれていることを確認
    const testCount = keywordArray.filter(k => k === 'test').length;
    expect(testCount).toBe(1);
  });
});
