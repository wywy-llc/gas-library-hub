import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { LibraryDetailDbRowFactories } from '../../../../factories/index.js';

// モック設定
vi.mock('../../../../../src/lib/server/db/index.js', () => ({
  db: {
    select: vi.fn(),
  },
}));

// Imports after mocks
import { db } from '../../../../../src/lib/server/db/index.js';
import { GetLibraryApiService } from '../../../../../src/lib/server/services/get-library-api-service.js';

const mockDb = db as unknown as {
  select: ReturnType<typeof vi.fn>;
};

describe('GetLibraryApiService', () => {
  // チェイン用のモック
  const createQueryChain = (result: unknown[]) => ({
    from: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(result),
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('call', () => {
    test('公開済みライブラリの詳細を正しく取得する', async () => {
      const mockRow = LibraryDetailDbRowFactories.default.build({ id: 'lib_123' });
      const queryChain = createQueryChain([mockRow]);
      mockDb.select.mockReturnValue(queryChain);

      const result = await GetLibraryApiService.call('lib_123');

      expect(result).not.toBeNull();
      expect(result?.success).toBe(true);
      expect(result?.data.id).toBe('lib_123');
      expect(result?.data.name).toBe('apps-script-oauth2');
      expect(result?.data.scriptId).toBe(
        '1B7FSrk5Zi6L1rSxxTDgDEUsPzlukDsi4KGuTMorsTQHhGBzBkMun4iDF'
      );
      expect(result?.data.repositoryUrl).toBe(
        'https://github.com/googleworkspace/apps-script-oauth2'
      );
      expect(result?.data.starCount).toBe(1500);
      expect(result?.data.scriptType).toBe('library');
    });

    test('AI要約情報を正しく変換する', async () => {
      const mockRow = LibraryDetailDbRowFactories.default.build();
      const queryChain = createQueryChain([mockRow]);
      mockDb.select.mockReturnValue(queryChain);

      const result = await GetLibraryApiService.call('lib_123');

      expect(result?.data.summary).not.toBeNull();
      expect(result?.data.summary?.libraryName).toEqual({
        ja: 'OAuth2ライブラリ',
        en: 'OAuth2 Library',
      });
      expect(result?.data.summary?.purpose).toEqual({
        ja: 'OAuth2認証を簡単に実装',
        en: 'Easy OAuth2 authentication',
      });
      expect(result?.data.summary?.tags).toEqual({
        ja: ['OAuth2', '認証'],
        en: ['OAuth2', 'authentication'],
      });
      expect(result?.data.summary?.mainBenefits).toHaveLength(1);
      expect(result?.data.summary?.usageExample).toBeDefined();
      expect(result?.data.summary?.seo.title).toEqual({
        ja: 'OAuth2ライブラリ - GAS用認証',
        en: 'OAuth2 Library - GAS Auth',
      });
    });

    test('要約がないライブラリではsummaryがnullになる', async () => {
      const mockRow = LibraryDetailDbRowFactories.withoutSummary.build();
      const queryChain = createQueryChain([mockRow]);
      mockDb.select.mockReturnValue(queryChain);

      const result = await GetLibraryApiService.call('lib_123');

      expect(result?.data.summary).toBeNull();
    });

    test('存在しないライブラリIDではnullを返す', async () => {
      const queryChain = createQueryChain([]);
      mockDb.select.mockReturnValue(queryChain);

      const result = await GetLibraryApiService.call('non_existent_id');

      expect(result).toBeNull();
    });

    test('lastCommitAtをISO文字列に変換する', async () => {
      const mockRow = LibraryDetailDbRowFactories.default.build({
        lastCommitAt: new Date('2024-01-15T10:30:00Z'),
      });
      const queryChain = createQueryChain([mockRow]);
      mockDb.select.mockReturnValue(queryChain);

      const result = await GetLibraryApiService.call('lib_123');

      expect(result?.data.lastCommitAt).toBe('2024-01-15T10:30:00.000Z');
    });

    test('lastCommitAtがnullの場合はnullを返す', async () => {
      const mockRow = LibraryDetailDbRowFactories.withoutLastCommit.build();
      const queryChain = createQueryChain([mockRow]);
      mockDb.select.mockReturnValue(queryChain);

      const result = await GetLibraryApiService.call('lib_123');

      expect(result?.data.lastCommitAt).toBeNull();
    });

    test('DBクエリに正しいフィールドを選択する', async () => {
      const mockRow = LibraryDetailDbRowFactories.default.build();
      const queryChain = createQueryChain([mockRow]);
      mockDb.select.mockReturnValue(queryChain);

      await GetLibraryApiService.call('lib_123');

      expect(mockDb.select).toHaveBeenCalledTimes(1);
      // selectに渡された引数（フィールド選択オブジェクト）を確認
      const selectArg = mockDb.select.mock.calls[0][0];
      expect(selectArg).toHaveProperty('id');
      expect(selectArg).toHaveProperty('name');
      expect(selectArg).toHaveProperty('scriptId');
      expect(selectArg).toHaveProperty('summaryId');
    });

    test('web_app型のライブラリも正しく取得する', async () => {
      const mockRow = LibraryDetailDbRowFactories.webApp.build();
      const queryChain = createQueryChain([mockRow]);
      mockDb.select.mockReturnValue(queryChain);

      const result = await GetLibraryApiService.call('lib_123');

      expect(result?.data.scriptType).toBe('web_app');
    });
  });
});
