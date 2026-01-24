import { type NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as Factory from 'factory.ts';
import { getDb } from '../scripts/db-pool.js';

// Drizzle DB型
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DrizzleDB = NodePgDatabase<any>;

/**
 * データベース接続を取得する共通ユーティリティ
 * プール接続を使用して接続オーバーヘッドを削減
 * @returns DrizzleDB インスタンス
 */
export const getDbConnection = (): DrizzleDB => {
  return getDb();
};

/**
 * 一意なIDを生成するヘルパー関数
 * @param prefix IDの接頭辞
 * @returns 一意なID文字列
 */
export const generateUniqueId = (prefix: string = 'id'): string => {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 11);
  return `${prefix}_${timestamp}_${randomSuffix}`;
};

// ============================================================================
// 型定義
// ============================================================================

/**
 * Partial型（factory.ts互換）
 */
export type FactoryPartial<T> = Partial<T>;

// ============================================================================
// FactoryWrapper (build/buildList用)
// ============================================================================

/**
 * テストデータファクトリのラッパーインターフェース
 */
export interface FactoryWrapper<T> {
  /** 単一オブジェクト生成 */
  build: (overrides?: Partial<T>) => T;
  /** 複数オブジェクト生成 */
  buildList: (count: number, overrides?: Partial<T>) => T[];
  /** 派生バリエーション作成用に内部ファクトリを公開 */
  readonly _factory: Factory.Sync.Factory<T, keyof T>;
}

/**
 * factory.tsファクトリをラップしてプロジェクト規約に準拠したインターフェースを提供
 *
 * @example
 * const userFactory = Factory.Sync.makeFactory<User>({ ... });
 * export const UserFactory = createFactoryWrapper(userFactory);
 *
 * // 使用例
 * const user = UserFactory.build({ name: 'カスタム' });
 * const users = UserFactory.buildList(3);
 */
export const createFactoryWrapper = <T>(
  factory: Factory.Sync.Factory<T, keyof T>
): FactoryWrapper<T> => {
  return {
    build: (overrides?: Partial<T>): T => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return factory.build((overrides ?? {}) as any);
    },
    buildList: (count: number, overrides?: Partial<T>): T[] => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return Array.from({ length: count }, () => factory.build((overrides ?? {}) as any));
    },
    _factory: factory,
  } as const;
};

// ============================================================================
// DatabaseFactoryWrapper (create用)
// ============================================================================

/**
 * DB保存機能付きファクトリのラッパーインターフェース
 */
export interface DatabaseFactoryWrapper<T, TReturn = string> {
  /** 単一オブジェクト生成（DB保存なし） */
  build: (overrides?: Partial<T>) => T;
  /** 複数オブジェクト生成（DB保存なし） */
  buildList: (count: number, overrides?: Partial<T>) => T[];
  /** DB保存付きオブジェクト生成 */
  create: (overrides?: Partial<T>) => Promise<TReturn>;
  /** 派生バリエーション作成用に内部ファクトリを公開 */
  readonly _factory: Factory.Sync.Factory<T, keyof T>;
}

/**
 * DB保存機能付きファクトリを作成
 *
 * @example
 * const userFactory = Factory.Sync.makeFactory<DatabaseUserData>({
 *   id: Factory.each(() => generateUniqueId('user')),
 *   email: 'test@example.com',
 * });
 *
 * export const DatabaseUserDataFactory = createDatabaseFactoryWrapper(
 *   'user',
 *   userFactory,
 *   async (db, data) => {
 *     const result = await db.insert(user).values(data).returning({ id: user.id });
 *     return result[0].id;
 *   }
 * );
 */
export const createDatabaseFactoryWrapper = <T, TReturn = string>(
  tableName: string,
  factory: Factory.Sync.Factory<T, keyof T>,
  insertFn: (db: DrizzleDB, data: T) => Promise<TReturn>
): DatabaseFactoryWrapper<T, TReturn> => {
  return {
    build: (overrides?: Partial<T>): T => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return factory.build((overrides ?? {}) as any);
    },
    buildList: (count: number, overrides?: Partial<T>): T[] => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return Array.from({ length: count }, () => factory.build((overrides ?? {}) as any));
    },
    create: async (overrides?: Partial<T>): Promise<TReturn> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = factory.build((overrides ?? {}) as any);
      const db = getDbConnection();
      try {
        return await insertFn(db, data);
      } catch (error) {
        console.error(`❌ ${tableName}作成エラー:`, error);
        throw error;
      }
    },
    _factory: factory,
  } as const;
};
