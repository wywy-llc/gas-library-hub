import { db } from '$lib/server/db/index.js';
import {
  sampleCode,
  sampleCopy,
  type SampleCopy,
  type SampleCopyInsert,
} from '$lib/server/db/schema.js';
import { and, eq, gte, lte, sql } from 'drizzle-orm';

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
   * 作者IDで日別コピー数を取得（トレンドチャート用）
   * サブクエリを使用してIN句の肥大化を回避
   */
  static async getDailyCountsByAuthorId(
    authorId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{ date: string; count: number }[]> {
    const result = await db
      .select({
        date: sql<string>`DATE(${sampleCopy.createdAt})::text`,
        count: sql<number>`count(*)::int`,
      })
      .from(sampleCopy)
      .innerJoin(sampleCode, eq(sampleCopy.sampleCodeId, sampleCode.id))
      .where(
        and(
          eq(sampleCode.authorId, authorId),
          gte(sampleCopy.createdAt, startDate),
          lte(sampleCopy.createdAt, endDate)
        )
      )
      .groupBy(sql`DATE(${sampleCopy.createdAt})`)
      .orderBy(sql`DATE(${sampleCopy.createdAt})`);

    return result;
  }

  /**
   * 作者IDでサンプル別の期間内コピー数を一括取得
   * N+1問題を回避するためのバッチ取得
   */
  static async getCountsByAuthorIdGroupedBySample(
    authorId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Map<string, number>> {
    const result = await db
      .select({
        sampleCodeId: sampleCopy.sampleCodeId,
        count: sql<number>`count(*)::int`,
      })
      .from(sampleCopy)
      .innerJoin(sampleCode, eq(sampleCopy.sampleCodeId, sampleCode.id))
      .where(
        and(
          eq(sampleCode.authorId, authorId),
          gte(sampleCopy.createdAt, startDate),
          lte(sampleCopy.createdAt, endDate)
        )
      )
      .groupBy(sampleCopy.sampleCodeId);

    return new Map(result.map(r => [r.sampleCodeId, r.count]));
  }

  /**
   * ユーザーのコピー履歴を取得
   */
  static async findByUserId(userId: string): Promise<SampleCopy[]> {
    return db.select().from(sampleCopy).where(eq(sampleCopy.userId, userId));
  }
}
