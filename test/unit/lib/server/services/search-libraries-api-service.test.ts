import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { LibrarySearchDbRowFactories } from '../../../../factories/index.js';

// モック設定
vi.mock('../../../../../src/lib/server/db/index.js', () => ({
  db: {
    select: vi.fn(),
  },
}));

// Imports after mocks
import { db } from '../../../../../src/lib/server/db/index.js';
import { SearchLibrariesApiService } from '../../../../../src/lib/server/services/search-libraries-api-service.js';

const mockDb = db as unknown as {
  select: ReturnType<typeof vi.fn>;
};

describe('SearchLibrariesApiService', () => {
  // 検索クエリ用チェインモック
  const createSearchQueryChain = (libraryResult: unknown[], countResult: number) => {
    const libraryChain = {
      from: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      offset: vi.fn().mockResolvedValue(libraryResult),
    };

    const countChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ count: countResult }]),
    };

    // select呼び出し回数に応じて異なるチェインを返す
    let callCount = 0;
    return () => {
      callCount++;
      return callCount === 1 ? libraryChain : countChain;
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('call', () => {
    test('デフォルトパラメータで検索結果を返す', async () => {
      const mockRows = [LibrarySearchDbRowFactories.default.build()];
      const selectMock = createSearchQueryChain(mockRows, 1);
      mockDb.select.mockImplementation(selectMock);

      const result = await SearchLibrariesApiService.call({});

      expect(result.success).toBe(true);
      expect(result.data.libraries).toHaveLength(1);
      expect(result.data.pagination.page).toBe(1);
      expect(result.data.pagination.limit).toBe(20); // DEFAULT_LIMIT
      expect(result.data.pagination.total).toBe(1);
    });

    test('検索結果のライブラリデータを正しくフォーマットする', async () => {
      const mockRows = [LibrarySearchDbRowFactories.oauth.build({ id: 'lib_oauth' })];
      const selectMock = createSearchQueryChain(mockRows, 1);
      mockDb.select.mockImplementation(selectMock);

      const result = await SearchLibrariesApiService.call({ locale: 'ja' });

      const library = result.data.libraries[0];
      expect(library.id).toBe('lib_oauth');
      expect(library.name).toBe('apps-script-oauth2');
      expect(library.scriptId).toBe('1B7FSrk5Zi6L1rSxxTDgDEUsPzlukDsi4KGuTMorsTQHhGBzBkMun4iDF');
      expect(library.tags).toEqual(['OAuth2', '認証']);
      expect(library.purpose).toBe('OAuth2認証を簡単に実装');
    });

    test('locale=enで英語タグ・目的を返す', async () => {
      const mockRows = [LibrarySearchDbRowFactories.oauth.build()];
      const selectMock = createSearchQueryChain(mockRows, 1);
      mockDb.select.mockImplementation(selectMock);

      const result = await SearchLibrariesApiService.call({ locale: 'en' });

      const library = result.data.libraries[0];
      expect(library.tags).toEqual(['OAuth2', 'authentication']);
      expect(library.purpose).toBe('Easy OAuth2 authentication');
    });

    test('ページネーションパラメータが正しく動作する', async () => {
      const mockRows = LibrarySearchDbRowFactories.default.buildList(2);
      const selectMock = createSearchQueryChain(mockRows, 10);
      mockDb.select.mockImplementation(selectMock);

      const result = await SearchLibrariesApiService.call({ page: 2, limit: 2 });

      expect(result.data.pagination.page).toBe(2);
      expect(result.data.pagination.limit).toBe(2);
      expect(result.data.pagination.total).toBe(10);
      expect(result.data.pagination.totalPages).toBe(5);
      expect(result.data.pagination.hasNext).toBe(true);
      expect(result.data.pagination.hasPrev).toBe(true);
    });

    test('limitがMAX_LIMIT(100)を超えない', async () => {
      const mockRows = [LibrarySearchDbRowFactories.default.build()];
      const selectMock = createSearchQueryChain(mockRows, 1);
      mockDb.select.mockImplementation(selectMock);

      const result = await SearchLibrariesApiService.call({ limit: 200 });

      expect(result.data.pagination.limit).toBe(100);
    });

    test('pageが1未満の場合は1に正規化される', async () => {
      const mockRows = [LibrarySearchDbRowFactories.default.build()];
      const selectMock = createSearchQueryChain(mockRows, 1);
      mockDb.select.mockImplementation(selectMock);

      const result = await SearchLibrariesApiService.call({ page: -5 });

      expect(result.data.pagination.page).toBe(1);
    });

    test('検索クエリ(q)がmetaに含まれる', async () => {
      const mockRows = [LibrarySearchDbRowFactories.oauth.build()];
      const selectMock = createSearchQueryChain(mockRows, 1);
      mockDb.select.mockImplementation(selectMock);

      const result = await SearchLibrariesApiService.call({ q: 'OAuth' });

      expect(result.meta.query).toBe('OAuth');
    });

    test('フィルタ情報がmetaに含まれる', async () => {
      const mockRows = [LibrarySearchDbRowFactories.oauth.build()];
      const selectMock = createSearchQueryChain(mockRows, 1);
      mockDb.select.mockImplementation(selectMock);

      const result = await SearchLibrariesApiService.call({
        scriptType: 'library',
        tags: 'OAuth,認証',
        minStars: 100,
      });

      expect(result.meta.filters.scriptType).toBe('library');
      expect(result.meta.filters.tags).toEqual(['OAuth', '認証']);
      expect(result.meta.filters.minStars).toBe(100);
    });

    test('tagsフィルタで結果をフィルタリングする', async () => {
      const mockRows = [
        LibrarySearchDbRowFactories.oauth.build({ id: 'lib_oauth' }),
        LibrarySearchDbRowFactories.spreadsheet.build({ id: 'lib_sheet' }),
      ];
      const selectMock = createSearchQueryChain(mockRows, 2);
      mockDb.select.mockImplementation(selectMock);

      const result = await SearchLibrariesApiService.call({ tags: 'OAuth2' });

      // tagsフィルタはアプリ側で実行されるため、OAuth2タグを持つライブラリのみ返される
      expect(
        result.data.libraries.every(lib =>
          lib.tags.some(tag => tag.toLowerCase().includes('oauth2'))
        )
      ).toBe(true);
    });

    test('空の検索結果を正しく処理する', async () => {
      const selectMock = createSearchQueryChain([], 0);
      mockDb.select.mockImplementation(selectMock);

      const result = await SearchLibrariesApiService.call({ q: 'nonexistent' });

      expect(result.success).toBe(true);
      expect(result.data.libraries).toHaveLength(0);
      expect(result.data.pagination.total).toBe(0);
      expect(result.data.pagination.totalPages).toBe(0);
      expect(result.data.pagination.hasNext).toBe(false);
      expect(result.data.pagination.hasPrev).toBe(false);
    });

    test('最後のページではhasNextがfalseになる', async () => {
      const mockRows = [LibrarySearchDbRowFactories.default.build()];
      const selectMock = createSearchQueryChain(mockRows, 5);
      mockDb.select.mockImplementation(selectMock);

      const result = await SearchLibrariesApiService.call({ page: 3, limit: 2 });

      // 5件、limit=2なので3ページ目が最後
      expect(result.data.pagination.hasNext).toBe(false);
      expect(result.data.pagination.hasPrev).toBe(true);
    });

    test('最初のページではhasPrevがfalseになる', async () => {
      const mockRows = [LibrarySearchDbRowFactories.default.build()];
      // limit=20 (デフォルト) でhasNextがtrueになるよう50件とする
      const selectMock = createSearchQueryChain(mockRows, 50);
      mockDb.select.mockImplementation(selectMock);

      const result = await SearchLibrariesApiService.call({ page: 1 });

      expect(result.data.pagination.hasPrev).toBe(false);
      expect(result.data.pagination.hasNext).toBe(true);
    });

    test('web_app型でフィルタリングできる', async () => {
      const mockRows = [LibrarySearchDbRowFactories.webApp.build()];
      const selectMock = createSearchQueryChain(mockRows, 1);
      mockDb.select.mockImplementation(selectMock);

      const result = await SearchLibrariesApiService.call({ scriptType: 'web_app' });

      expect(result.meta.filters.scriptType).toBe('web_app');
    });

    test('タグがnullのライブラリは空配列として返す', async () => {
      const mockRows = [LibrarySearchDbRowFactories.withoutTags.build()];
      const selectMock = createSearchQueryChain(mockRows, 1);
      mockDb.select.mockImplementation(selectMock);

      const result = await SearchLibrariesApiService.call({ locale: 'ja' });

      expect(result.data.libraries[0].tags).toEqual([]);
    });

    test('purposeがnullのライブラリはnullとして返す', async () => {
      const mockRows = [LibrarySearchDbRowFactories.withoutPurpose.build()];
      const selectMock = createSearchQueryChain(mockRows, 1);
      mockDb.select.mockImplementation(selectMock);

      const result = await SearchLibrariesApiService.call({ locale: 'ja' });

      expect(result.data.libraries[0].purpose).toBeNull();
    });

    test('scriptIdがnullの場合は空文字列を返す', async () => {
      const mockRows = [LibrarySearchDbRowFactories.withoutScriptId.build()];
      const selectMock = createSearchQueryChain(mockRows, 1);
      mockDb.select.mockImplementation(selectMock);

      const result = await SearchLibrariesApiService.call({});

      expect(result.data.libraries[0].scriptId).toBe('');
    });
  });
});
