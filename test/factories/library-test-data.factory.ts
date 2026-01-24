import * as Factory from 'factory.ts';
import { LIBRARY_STATUS, type LibraryStatus } from '../../src/lib/constants/library-status';
import { LICENSE_TYPES } from '../../src/lib/constants/license-types';
import { library, type Library } from '../../src/lib/server/db/schema';
import {
  createDatabaseFactoryWrapper,
  createFactoryWrapper,
  generateUniqueId,
  type FactoryWrapper,
} from './base.factory';

/**
 * ライブラリステータス（constants/library-status.tsから使用）
 */
export { LIBRARY_STATUS } from '../../src/lib/constants/library-status';
export type { LibraryStatus } from '../../src/lib/constants/library-status';

/**
 * ライブラリ作成用入力データ（drizzleスキーマから推論）
 */
export type CreateLibraryInput = Omit<
  typeof library.$inferInsert,
  'id' | 'createdAt' | 'updatedAt'
>;

/**
 * データベース作成用のライブラリ情報
 * drizzleスキーマのCreateLibraryInputを基盤とし、IDを追加
 */
export interface DatabaseLibraryData extends CreateLibraryInput {
  id: string;
  status: LibraryStatus;
}

/**
 * テスト用のライブラリデータ（drizzleスキーマベース）
 * CreateLibraryInputを基盤とし、テストで必要な最小限のデータ構造
 */
export type LibraryTestData = CreateLibraryInput;

/**
 * 作成済みライブラリデータ（Library型エクスポート）
 * LibraryRepository.createの戻り値に対応
 */
export type { Library } from '../../src/lib/server/db/schema';
export type CreatedLibraryTestData = Library;

// ベースファクトリ定義
const baseLibraryFactory = Factory.Sync.makeFactory<LibraryTestData>({
  name: 'apps-script-oauth2',
  scriptId: '1B7FSrk5Zi6L1rSxxTDgDEUsPzlukDsi4KGuTMorsTQHhGBzBkMun4iDF',
  repositoryUrl: 'https://github.com/googleworkspace/apps-script-oauth2',
  authorUrl: 'https://github.com/googleworkspace',
  authorName: 'googleworkspace',
  description: 'OAuth2 library for Google Apps Script',
  starCount: 100,
  copyCount: 0,
  licenseType: LICENSE_TYPES.APACHE_2_0,
  licenseUrl: 'https://github.com/googleworkspace/apps-script-oauth2/blob/main/LICENSE',
  lastCommitAt: new Date('2024-01-15T10:30:00Z'),
  status: LIBRARY_STATUS.PENDING,
  scriptType: 'library',
  requesterId: undefined,
  requestNote: undefined,
});

/**
 * ライブラリテストデータのFactory群
 * drizzleスキーマベースで統一されたテストデータを生成
 */
export const LibraryTestDataFactories: Record<string, FactoryWrapper<LibraryTestData>> = {
  default: createFactoryWrapper(baseLibraryFactory),
  alternative: createFactoryWrapper(
    baseLibraryFactory.extend({
      name: 'sample-library',
      scriptId: '1AbCdEfGhIjKlMnOpQrStUvWxYz1234567890',
      repositoryUrl: 'https://github.com/example/sample-library',
      authorUrl: 'https://github.com/example',
      authorName: 'example',
      description: 'Sample library for testing',
      starCount: 50,
      licenseType: LICENSE_TYPES.MIT,
      licenseUrl: 'https://github.com/example/sample-library/blob/main/LICENSE',
      lastCommitAt: new Date('2024-02-20T14:45:00Z'),
    })
  ),
};

// ステータス別ベースファクトリ
const publishedBaseFactory = Factory.Sync.makeFactory<LibraryTestData>({
  name: 'GasLogger',
  scriptId: '1B7FSrk5Zi6L1rSxxTDgDEUsPzlukDsi4KGuTMorsTQHhGBzBkMun4iDF',
  repositoryUrl: 'https://github.com/gas-developer/GasLogger',
  authorUrl: 'https://github.com/gas-developer',
  authorName: 'gas-developer',
  description: 'スプレッドシートやCloud Loggingに簡単・高機能なログ出力機能を追加します。',
  starCount: 847,
  copyCount: 0,
  licenseType: LICENSE_TYPES.MIT,
  licenseUrl: 'https://github.com/gas-developer/GasLogger/blob/main/LICENSE',
  lastCommitAt: new Date('2024-03-10T09:15:00Z'),
  status: LIBRARY_STATUS.PUBLISHED,
  scriptType: 'library',
  requesterId: undefined,
  requestNote: undefined,
});

/**
 * ステータス別ライブラリテストデータFactory群
 * drizzleスキーマベース、ステータス別のプリセット
 */
export const LibraryStatusTestDataFactories: Record<string, FactoryWrapper<LibraryTestData>> = {
  published: createFactoryWrapper(publishedBaseFactory),
  pending: createFactoryWrapper(
    publishedBaseFactory.extend({
      name: 'PendingLibrary',
      scriptId: '1AbCdEfGhIjKlMnOpQrStUvWxYz1234567890',
      repositoryUrl: 'https://github.com/test-user/PendingLibrary',
      authorUrl: 'https://github.com/test-user',
      authorName: 'test-user',
      description: '未公開のライブラリです。検索結果には表示されません。',
      starCount: 10,
      licenseType: LICENSE_TYPES.APACHE_2_0,
      licenseUrl: 'https://github.com/test-user/PendingLibrary/blob/main/LICENSE',
      lastCommitAt: new Date('2024-04-05T16:20:00Z'),
      status: LIBRARY_STATUS.PENDING,
    })
  ),
  gasDateFormatter: createFactoryWrapper(
    publishedBaseFactory.extend({
      name: 'GasDateFormatter',
      scriptId: '1DaTeFoRmAtTeR1234567890AbCdEfGhIjKlMnOpQrStUvWxYz',
      repositoryUrl: 'https://github.com/date-wizard/GasDateFormatter',
      authorUrl: 'https://github.com/date-wizard',
      authorName: 'date-wizard',
      description: 'Moment.jsライクな日時フォーマットライブラリ',
      starCount: 234,
      licenseType: LICENSE_TYPES.BSD_3_CLAUSE,
      licenseUrl: 'https://github.com/date-wizard/GasDateFormatter/blob/main/LICENSE',
      lastCommitAt: new Date('2024-05-12T11:30:00Z'),
      status: LIBRARY_STATUS.PUBLISHED,
    })
  ),
  gasCalendarSync: createFactoryWrapper(
    publishedBaseFactory.extend({
      name: 'GasCalendarSync',
      scriptId: '1CaLeNdArSyNc1234567890AbCdEfGhIjKlMnOpQrStUvWxYz',
      repositoryUrl: 'https://github.com/sync-expert/GasCalendarSync',
      authorUrl: 'https://github.com/sync-expert',
      authorName: 'sync-expert',
      description: 'Googleカレンダー同期ライブラリ',
      starCount: 456,
      licenseType: LICENSE_TYPES.MIT,
      licenseUrl: 'https://github.com/sync-expert/GasCalendarSync/blob/main/LICENSE',
      lastCommitAt: new Date('2024-06-08T13:45:00Z'),
      status: LIBRARY_STATUS.PUBLISHED,
    })
  ),
};

// Database用ファクトリ
const databaseLibraryFactory = Factory.Sync.makeFactory<DatabaseLibraryData>({
  id: Factory.each(() => generateUniqueId('lib')),
  name: 'apps-script-oauth2',
  scriptId: Factory.each(
    () => `1B7FSrk5Zi6L1rSxxTDgDEUsPzlukDsi4KGuTMorsTQHhGBzBkMun4iDF_${Date.now()}`
  ),
  repositoryUrl: Factory.each(
    () => `https://github.com/googleworkspace/apps-script-oauth2-${Date.now()}`
  ),
  authorUrl: 'https://github.com/googleworkspace',
  authorName: 'googleworkspace',
  description: 'A library for OAuth2 in Google Apps Script',
  starCount: 100,
  copyCount: 0,
  licenseType: LICENSE_TYPES.APACHE_2_0,
  licenseUrl: Factory.each(
    () => `https://github.com/googleworkspace/apps-script-oauth2-${Date.now()}/blob/main/LICENSE`
  ),
  lastCommitAt: new Date('2024-01-15T10:30:00Z'),
  status: LIBRARY_STATUS.PENDING,
  scriptType: 'library',
  requesterId: undefined,
  requestNote: undefined,
});

/**
 * データベース作成用のライブラリデータFactory
 * 共通化されたcreateDatabaseFactoryWrapperを使用してデータベースに直接ライブラリを作成
 */
export const DatabaseLibraryDataFactory = createDatabaseFactoryWrapper<DatabaseLibraryData>(
  'library',
  databaseLibraryFactory,
  async (db, libraryData) => {
    await db.insert(library).values(libraryData);
    return libraryData.id;
  }
);

/**
 * DatabaseLibraryDataFactoryの使用例
 *
 * ```typescript
 * // create()メソッドを使用してデータベースにライブラリを直接作成
 *
 * // 承認待ち状態のライブラリを作成
 * const libraryId = await DatabaseLibraryDataFactory.create();
 *
 * // 特定のステータスでライブラリを作成
 * const publishedLibraryId = await DatabaseLibraryDataFactory.create({ status: 'published' });
 *
 * // カスタムデータでライブラリを作成
 * const customLibraryId = await DatabaseLibraryDataFactory.create({
 *   scriptId: 'custom-script-id',
 *   name: 'Custom Library',
 *   status: 'published'
 * });
 * ```
 */

// CreatedLibrary用ファクトリ（LibraryRepository.createの戻り値に対応）
const baseCreatedLibraryFactory = Factory.Sync.makeFactory<CreatedLibraryTestData>({
  id: 'mock-library-id',
  name: 'Test Library',
  scriptId: 'TEST_SCRIPT_ID',
  repositoryUrl: 'https://github.com/owner/repo',
  authorUrl: 'https://github.com/owner',
  authorName: 'owner',
  description: 'Test description',
  starCount: 100,
  copyCount: 0,
  licenseType: 'MIT',
  licenseUrl: 'https://example.com/license',
  lastCommitAt: new Date('2024-01-01T00:00:00Z'),
  status: 'pending',
  scriptType: 'library',
  scriptValidationStatus: null,
  requesterId: null,
  requestNote: null,
  createdAt: new Date(),
  updatedAt: new Date(),
});

/**
 * 作成済みライブラリのテストデータファクトリ
 * LibraryRepository.createの戻り値をモック
 */
export const CreatedLibraryTestDataFactories: Record<
  string,
  FactoryWrapper<CreatedLibraryTestData>
> = {
  default: createFactoryWrapper(baseCreatedLibraryFactory),
  /**
   * CreateLibraryServiceテスト用プリセット
   */
  forCreateLibraryService: createFactoryWrapper(
    baseCreatedLibraryFactory.extend({
      id: 'mock-library-id',
      name: 'Test Library',
      scriptId: 'TEST_SCRIPT_ID',
      repositoryUrl: 'https://github.com/owner/repo',
      authorUrl: 'https://github.com/owner',
      authorName: 'owner',
      description: 'Test description',
      starCount: 100,
      copyCount: 0,
      licenseType: 'MIT',
      licenseUrl: 'https://example.com/license',
      lastCommitAt: new Date('2024-01-01T00:00:00Z'),
      status: 'pending',
    })
  ),
};
