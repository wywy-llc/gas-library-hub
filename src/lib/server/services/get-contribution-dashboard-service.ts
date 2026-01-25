import { SampleCodeRepository } from '$lib/server/repositories/sample-code-repository.js';
import { SampleCopyRepository } from '$lib/server/repositories/sample-copy-repository.js';
import { UserNotificationRepository } from '$lib/server/repositories/user-notification-repository.js';
import type { SampleCode, UserNotification } from '$lib/server/db/schema.js';

/**
 * サマリー統計
 */
export interface DashboardSummary {
  totalSamples: number;
  totalCopies: number;
  totalLikes: number;
  totalViews: number;
}

/**
 * トレンドデータ（日別）
 */
export interface TrendData {
  date: string;
  copies: number;
}

/**
 * サンプルパフォーマンス
 */
export interface SamplePerformance {
  sample: SampleCode;
  copyCount: number;
  likeCount: number;
  viewCount: number;
  recentCopies: number; // 直近30日のコピー数
}

/**
 * ダッシュボードデータ
 */
export interface DashboardData {
  summary: DashboardSummary;
  trend: TrendData[];
  topSamples: SamplePerformance[];
  recentNotifications: UserNotification[];
  unreadNotificationCount: number;
}

/**
 * 貢献度ダッシュボードデータを取得するサービス
 *
 * 機能:
 * - サマリー統計の集計
 * - 30日間のトレンドデータ
 * - サンプル別パフォーマンス
 * - 最新のフィードバック通知
 */
export const GetContributionDashboardService = (() => {
  /**
   * 過去30日間の日付リストを生成
   */
  const getLast30Days = (): Date[] => {
    const dates: Date[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      dates.push(date);
    }
    return dates;
  };

  /**
   * 日付をYYYY-MM-DD形式に変換
   */
  const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  return {
    /**
     * ダッシュボードデータを取得
     *
     * @param userId ユーザーID
     * @returns ダッシュボードデータ
     *
     * @example
     * ```typescript
     * const dashboard = await GetContributionDashboardService.call('user123');
     * console.log(dashboard.summary.totalCopies);
     * ```
     */
    call: async (userId: string): Promise<DashboardData> => {
      // ユーザーのサンプル一覧を取得
      const samples = await SampleCodeRepository.findByAuthorId(userId);

      // サマリー統計を計算
      const summary: DashboardSummary = {
        totalSamples: samples.length,
        totalCopies: samples.reduce((sum, s) => sum + s.copyCount, 0),
        totalLikes: samples.reduce((sum, s) => sum + s.likeCount, 0),
        totalViews: samples.reduce((sum, s) => sum + s.viewCount, 0),
      };

      // 30日間のトレンドデータを取得
      const last30Days = getLast30Days();
      const startDate = last30Days[0];
      const endDate = new Date();
      endDate.setHours(23, 59, 59, 999);

      const sampleIds = samples.map(s => s.id);
      const dailyCopies =
        sampleIds.length > 0
          ? await SampleCopyRepository.getDailyCountsByDateRange(sampleIds, startDate, endDate)
          : [];

      // 日別データをマップに変換
      const copiesMap = new Map(dailyCopies.map(d => [d.date, d.count]));

      // 全日付のトレンドデータを生成（データがない日は0）
      const trend: TrendData[] = last30Days.map(date => ({
        date: formatDate(date),
        copies: copiesMap.get(formatDate(date)) ?? 0,
      }));

      // 直近30日のコピー数を計算してサンプルパフォーマンスを生成
      const recentCopiesPromises = samples.map(async sample => {
        const recentCopies = await SampleCopyRepository.getCountByDateRange(
          sample.id,
          startDate,
          endDate
        );
        return {
          sample,
          copyCount: sample.copyCount,
          likeCount: sample.likeCount,
          viewCount: sample.viewCount,
          recentCopies,
        };
      });

      const samplePerformances = await Promise.all(recentCopiesPromises);

      // コピー数でソートしてトップ10を取得
      const topSamples = samplePerformances.sort((a, b) => b.copyCount - a.copyCount).slice(0, 10);

      // 最新の通知を取得
      const [recentNotifications, unreadNotificationCount] = await Promise.all([
        UserNotificationRepository.findByUserId(userId, { limit: 10 }),
        UserNotificationRepository.getUnreadCount(userId),
      ]);

      return {
        summary,
        trend,
        topSamples,
        recentNotifications,
        unreadNotificationCount,
      };
    },

    /**
     * 未読通知数のみを取得（ヘッダーバッジ用）
     */
    getUnreadCount: async (userId: string): Promise<number> => {
      return UserNotificationRepository.getUnreadCount(userId);
    },

    /**
     * サマリー統計のみを取得
     */
    getSummary: async (userId: string): Promise<DashboardSummary> => {
      const samples = await SampleCodeRepository.findByAuthorId(userId);
      return {
        totalSamples: samples.length,
        totalCopies: samples.reduce((sum, s) => sum + s.copyCount, 0),
        totalLikes: samples.reduce((sum, s) => sum + s.likeCount, 0),
        totalViews: samples.reduce((sum, s) => sum + s.viewCount, 0),
      };
    },
  } as const;
})();
