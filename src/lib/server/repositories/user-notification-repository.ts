import { db } from '$lib/server/db/index.js';
import {
  userNotification,
  type UserNotification,
  type UserNotificationInsert,
} from '$lib/server/db/schema.js';
import { and, desc, eq, sql } from 'drizzle-orm';

/**
 * ユーザー通知テーブルのデータアクセス層
 */
export class UserNotificationRepository {
  /**
   * IDで通知を検索
   */
  static async findById(id: string): Promise<UserNotification | null> {
    const result = await db
      .select()
      .from(userNotification)
      .where(eq(userNotification.id, id))
      .limit(1);
    return result.length > 0 ? result[0] : null;
  }

  /**
   * ユーザーの通知一覧を取得
   */
  static async findByUserId(
    userId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<UserNotification[]> {
    const query = db
      .select()
      .from(userNotification)
      .where(eq(userNotification.userId, userId))
      .orderBy(desc(userNotification.createdAt));

    if (options?.limit) {
      query.limit(options.limit);
    }
    if (options?.offset) {
      query.offset(options.offset);
    }

    return query;
  }

  /**
   * ユーザーの未読通知数を取得
   */
  static async getUnreadCount(userId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(userNotification)
      .where(and(eq(userNotification.userId, userId), eq(userNotification.isRead, false)));
    return result[0]?.count ?? 0;
  }

  /**
   * 通知を作成
   */
  static async create(data: UserNotificationInsert): Promise<UserNotification> {
    const result = await db.insert(userNotification).values(data).returning();
    return result[0];
  }

  /**
   * 通知を既読にする
   */
  static async markAsRead(id: string): Promise<void> {
    await db.update(userNotification).set({ isRead: true }).where(eq(userNotification.id, id));
  }

  /**
   * ユーザーの全通知を既読にする
   */
  static async markAllAsRead(userId: string): Promise<void> {
    await db
      .update(userNotification)
      .set({ isRead: true })
      .where(and(eq(userNotification.userId, userId), eq(userNotification.isRead, false)));
  }

  /**
   * 通知を削除
   */
  static async delete(id: string): Promise<void> {
    await db.delete(userNotification).where(eq(userNotification.id, id));
  }
}
