import { db } from '$lib/server/db/index.js';
import {
  sampleCode,
  type SampleCode,
  type SampleCodeInsert,
  type SampleCodeStatus,
} from '$lib/server/db/schema.js';
import { and, desc, eq, sql } from 'drizzle-orm';

/**
 * サンプルコードテーブルのデータアクセス層
 */
export class SampleCodeRepository {
  /**
   * IDでサンプルコードを検索
   */
  static async findById(id: string): Promise<SampleCode | null> {
    const result = await db.select().from(sampleCode).where(eq(sampleCode.id, id)).limit(1);
    return result.length > 0 ? result[0] : null;
  }

  /**
   * IDでサンプルコードを検索（必須）
   */
  static async findByIdOrThrow(id: string): Promise<SampleCode> {
    const result = await this.findById(id);
    if (!result) {
      throw new Error(`Sample code not found: ${id}`);
    }
    return result;
  }

  /**
   * 投稿者IDでサンプルコードを検索
   */
  static async findByAuthorId(
    authorId: string,
    options?: { status?: SampleCodeStatus }
  ): Promise<SampleCode[]> {
    const conditions = [eq(sampleCode.authorId, authorId)];

    if (options?.status) {
      conditions.push(eq(sampleCode.status, options.status));
    }

    return db
      .select()
      .from(sampleCode)
      .where(and(...conditions))
      .orderBy(desc(sampleCode.createdAt));
  }

  /**
   * ライブラリIDでサンプルコードを検索
   */
  static async findByLibraryId(libraryId: string): Promise<SampleCode[]> {
    return db
      .select()
      .from(sampleCode)
      .where(and(eq(sampleCode.libraryId, libraryId), eq(sampleCode.status, 'published')))
      .orderBy(desc(sampleCode.createdAt));
  }

  /**
   * 公開されたサンプルコードをページネーション付きで取得
   */
  static async findPublishedWithPagination(options: {
    limit: number;
    offset: number;
    orderBy?: 'createdAt' | 'likeCount' | 'copyCount';
  }): Promise<{ samples: SampleCode[]; total: number }> {
    const { limit, offset, orderBy = 'createdAt' } = options;

    const orderColumn =
      orderBy === 'likeCount'
        ? sampleCode.likeCount
        : orderBy === 'copyCount'
          ? sampleCode.copyCount
          : sampleCode.createdAt;

    const [samples, countResult] = await Promise.all([
      db
        .select()
        .from(sampleCode)
        .where(eq(sampleCode.status, 'published'))
        .orderBy(desc(orderColumn))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(sampleCode)
        .where(eq(sampleCode.status, 'published')),
    ]);

    return {
      samples,
      total: countResult[0]?.count ?? 0,
    };
  }

  /**
   * サンプルコードを作成
   */
  static async create(data: SampleCodeInsert): Promise<SampleCode> {
    const result = await db.insert(sampleCode).values(data).returning();
    return result[0];
  }

  /**
   * サンプルコードを更新
   */
  static async update(id: string, data: Partial<SampleCodeInsert>): Promise<SampleCode> {
    const result = await db
      .update(sampleCode)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(sampleCode.id, id))
      .returning();

    if (result.length === 0) {
      throw new Error(`Sample code not found for update: ${id}`);
    }

    return result[0];
  }

  /**
   * コピー数をインクリメント
   */
  static async incrementCopyCount(id: string): Promise<void> {
    await db
      .update(sampleCode)
      .set({
        copyCount: sql`${sampleCode.copyCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(sampleCode.id, id));
  }

  /**
   * いいね数をインクリメント
   */
  static async incrementLikeCount(id: string): Promise<void> {
    await db
      .update(sampleCode)
      .set({
        likeCount: sql`${sampleCode.likeCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(sampleCode.id, id));
  }

  /**
   * いいね数をデクリメント
   */
  static async decrementLikeCount(id: string): Promise<void> {
    await db
      .update(sampleCode)
      .set({
        likeCount: sql`GREATEST(${sampleCode.likeCount} - 1, 0)`,
        updatedAt: new Date(),
      })
      .where(eq(sampleCode.id, id));
  }

  /**
   * 閲覧数をインクリメント
   */
  static async incrementViewCount(id: string): Promise<void> {
    await db
      .update(sampleCode)
      .set({
        viewCount: sql`${sampleCode.viewCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(sampleCode.id, id));
  }

  /**
   * サンプルコードを削除
   */
  static async delete(id: string): Promise<void> {
    const result = await db.delete(sampleCode).where(eq(sampleCode.id, id)).returning();
    if (result.length === 0) {
      throw new Error(`Sample code not found for deletion: ${id}`);
    }
  }
}
