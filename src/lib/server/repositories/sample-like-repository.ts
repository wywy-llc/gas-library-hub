import { db } from '$lib/server/db/index.js';
import { sampleLike, type SampleLike, type SampleLikeInsert } from '$lib/server/db/schema.js';
import { and, eq } from 'drizzle-orm';

/**
 * サンプルいいねテーブルのデータアクセス層
 */
export class SampleLikeRepository {
  /**
   * ユーザーとサンプルの組み合わせでいいねを検索
   */
  static async findByUserAndSample(
    userId: string,
    sampleCodeId: string
  ): Promise<SampleLike | null> {
    const result = await db
      .select()
      .from(sampleLike)
      .where(and(eq(sampleLike.userId, userId), eq(sampleLike.sampleCodeId, sampleCodeId)))
      .limit(1);
    return result.length > 0 ? result[0] : null;
  }

  /**
   * ユーザーがサンプルにいいねしているかチェック
   */
  static async existsByUserAndSample(userId: string, sampleCodeId: string): Promise<boolean> {
    const result = await this.findByUserAndSample(userId, sampleCodeId);
    return result !== null;
  }

  /**
   * いいねを作成
   */
  static async create(data: SampleLikeInsert): Promise<SampleLike> {
    const result = await db.insert(sampleLike).values(data).returning();
    return result[0];
  }

  /**
   * いいねを削除
   */
  static async delete(userId: string, sampleCodeId: string): Promise<void> {
    await db
      .delete(sampleLike)
      .where(and(eq(sampleLike.userId, userId), eq(sampleLike.sampleCodeId, sampleCodeId)));
  }

  /**
   * ユーザーのいいね一覧を取得
   */
  static async findByUserId(userId: string): Promise<SampleLike[]> {
    return db.select().from(sampleLike).where(eq(sampleLike.userId, userId));
  }

  /**
   * サンプルのいいね一覧を取得
   */
  static async findBySampleCodeId(sampleCodeId: string): Promise<SampleLike[]> {
    return db.select().from(sampleLike).where(eq(sampleLike.sampleCodeId, sampleCodeId));
  }
}
