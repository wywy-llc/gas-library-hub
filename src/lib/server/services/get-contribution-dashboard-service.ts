import type { SampleCode, UserNotification } from '$lib/server/db/schema.js';
import { SampleCodeRepository } from '$lib/server/repositories/sample-code-repository.js';
import { SampleCopyRepository } from '$lib/server/repositories/sample-copy-repository.js';
import { UserNotificationRepository } from '$lib/server/repositories/user-notification-repository.js';

// ──────────────────────────────────────────────────────────────────────────────
// 定数
// ──────────────────────────────────────────────────────────────────────────────

/** トレンドデータの日数 */
const TREND_DAYS = 30;

/** トップサンプルの表示件数 */
const TOP_SAMPLES_LIMIT = 10;

/** 最新通知の表示件数 */
const RECENT_NOTIFICATIONS_LIMIT = 10;

// ──────────────────────────────────────────────────────────────────────────────
// 型定義
// ──────────────────────────────────────────────────────────────────────────────

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
  recentCopies: number; // 直近のコピー数（TREND_DAYS日間）
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
   * 過去N日間の日付リストを生成
   */
  const getLastNDays = (days: number): Date[] => {
    const dates: Date[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = days - 1; i >= 0; i--) {
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

  /**
   * サンプル一覧からサマリー統計を計算（単一走査: O(n)）
   */
  const calculateSummary = (samples: SampleCode[]): DashboardSummary => {
    let totalCopies = 0;
    let totalLikes = 0;
    let totalViews = 0;

    for (const s of samples) {
      totalCopies += s.copyCount;
      totalLikes += s.likeCount;
      totalViews += s.viewCount;
    }

    return {
      totalSamples: samples.length,
      totalCopies,
      totalLikes,
      totalViews,
    };
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
      // トレンドデータ用の日付範囲を事前計算
      const trendDays = getLastNDays(TREND_DAYS);
      const startDate = trendDays[0];
      const endDate = new Date();
      endDate.setHours(23, 59, 59, 999);

      // 日付文字列を事前計算（formatDate重複呼び出しを排除）
      const formattedDates = trendDays.map(formatDate);

      // すべての独立したDB呼び出しを並列実行
      const [samples, dailyCopies, recentCopiesMap, recentNotifications, unreadNotificationCount] =
        await Promise.all([
          SampleCodeRepository.findByAuthorId(userId),
          SampleCopyRepository.getDailyCountsByAuthorId(userId, startDate, endDate),
          SampleCopyRepository.getCountsByAuthorIdGroupedBySample(userId, startDate, endDate),
          UserNotificationRepository.findByUserId(userId, { limit: RECENT_NOTIFICATIONS_LIMIT }),
          UserNotificationRepository.getUnreadCount(userId),
        ]);

      // サマリー統計を計算
      const summary = calculateSummary(samples);

      // 日別データをマップに変換
      const copiesMap = new Map(dailyCopies.map(d => [d.date, d.count]));

      // 全日付のトレンドデータを生成（事前計算した日付文字列を使用）
      const trend: TrendData[] = formattedDates.map(dateStr => ({
        date: dateStr,
        copies: copiesMap.get(dateStr) ?? 0,
      }));

      // サンプルパフォーマンスを生成（N+1問題を回避）
      const samplePerformances: SamplePerformance[] = samples.map(sample => ({
        sample,
        copyCount: sample.copyCount,
        likeCount: sample.likeCount,
        viewCount: sample.viewCount,
        recentCopies: recentCopiesMap.get(sample.id) ?? 0,
      }));

      // コピー数でソートしてトップN件を取得
      const topSamples = samplePerformances
        .sort((a, b) => b.copyCount - a.copyCount)
        .slice(0, TOP_SAMPLES_LIMIT);

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
      return calculateSummary(samples);
    },
  } as const;
})();
