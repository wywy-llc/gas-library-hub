import { db } from '$lib/server/db/index.js';
import { sampleCopy, type SampleCopy, type SampleCopyInsert } from '$lib/server/db/schema.js';
import { and, eq, gte, inArray, lte, sql } from 'drizzle-orm';

/**
 * サンプルコピー履歴テーブルのデータアクセス層
 */
export class SampleCopyRepository {
  /**
   * コピー履歴を作成
   */
  static async create(data: SampleCopyInsert): Promise<SampleCopy> {
    const result = await db.insert(sampleCopy).values(data).returning();
    return result[0];
  }

  /**
   * サンプルのコピー履歴を取得
   */
  static async findBySampleCodeId(sampleCodeId: string): Promise<SampleCopy[]> {
    return db.select().from(sampleCopy).where(eq(sampleCopy.sampleCodeId, sampleCodeId));
  }

  /**
   * 期間内のコピー数を取得（トレンド分析用）
   */
  static async getCountByDateRange(
    sampleCodeId: string,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(sampleCopy)
      .where(
        and(
          eq(sampleCopy.sampleCodeId, sampleCodeId),
          gte(sampleCopy.createdAt, startDate),
          lte(sampleCopy.createdAt, endDate)
        )
      );
    return result[0]?.count ?? 0;
  }

  /**
   * 日別コピー数を取得（トレンドチャート用）
   */
  static async getDailyCountsByDateRange(
    sampleCodeIds: string[],
    startDate: Date,
    endDate: Date
  ): Promise<{ date: string; count: number }[]> {
    if (sampleCodeIds.length === 0) {
      return [];
    }

    const result = await db
      .select({
        date: sql<string>`DATE(${sampleCopy.createdAt})::text`,
        count: sql<number>`count(*)::int`,
      })
      .from(sampleCopy)
      .where(
        and(
          inArray(sampleCopy.sampleCodeId, sampleCodeIds),
          gte(sampleCopy.createdAt, startDate),
          lte(sampleCopy.createdAt, endDate)
        )
      )
      .groupBy(sql`DATE(${sampleCopy.createdAt})`)
      .orderBy(sql`DATE(${sampleCopy.createdAt})`);

    return result;
  }

  /**
   * ユーザーのコピー履歴を取得
   */
  static async findByUserId(userId: string): Promise<SampleCopy[]> {
    return db.select().from(sampleCopy).where(eq(sampleCopy.userId, userId));
  }
}
