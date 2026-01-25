import { SampleCodeRepository } from '$lib/server/repositories/sample-code-repository.js';
import { SampleLikeRepository } from '$lib/server/repositories/sample-like-repository.js';
import { UserNotificationRepository } from '$lib/server/repositories/user-notification-repository.js';
import { generateId } from '$lib/server/utils/generate-id.js';

/**
 * いいねトグル結果
 */
export interface ToggleLikeResult {
  liked: boolean;
  likeCount: number;
}

/**
 * サンプルコードのいいねをトグルするサービス
 *
 * 機能:
 * - いいねの追加/削除
 * - いいね数の更新
 * - 投稿者への通知作成
 */
export class ToggleSampleLikeService {
  /**
   * いいねをトグル
   *
   * @param userId いいねするユーザーID
   * @param sampleCodeId サンプルコードID
   * @returns トグル結果（いいね状態と現在のいいね数）
   *
   * @example
   * ```typescript
   * const result = await ToggleSampleLikeService.toggle('user123', 'sample456');
   * // result.liked === true (いいねした)
   * // result.liked === false (いいね解除した)
   * ```
   */
  static async toggle(userId: string, sampleCodeId: string): Promise<ToggleLikeResult> {
    const existingLike = await SampleLikeRepository.findByUserAndSample(userId, sampleCodeId);

    if (existingLike) {
      return this.removeLike(userId, sampleCodeId);
    }

    return this.addLike(userId, sampleCodeId);
  }

  /**
   * いいねを追加
   */
  private static async addLike(userId: string, sampleCodeId: string): Promise<ToggleLikeResult> {
    const sample = await SampleCodeRepository.findByIdOrThrow(sampleCodeId);

    // いいね作成とカウント更新を並列実行
    await Promise.all([
      SampleLikeRepository.create({
        id: generateId(),
        userId,
        sampleCodeId,
      }),
      SampleCodeRepository.incrementLikeCount(sampleCodeId),
    ]);

    // 投稿者への通知（自分自身へのいいねは通知しない）
    if (sample.authorId !== userId) {
      await UserNotificationRepository.create({
        id: generateId(),
        userId: sample.authorId,
        type: 'like',
        sampleCodeId,
        actorId: userId,
        metadata: {},
      });
    }

    return this.buildResult(true, sampleCodeId);
  }

  /**
   * いいねを解除
   */
  private static async removeLike(userId: string, sampleCodeId: string): Promise<ToggleLikeResult> {
    // 削除とカウント更新を並列実行
    await Promise.all([
      SampleLikeRepository.delete(userId, sampleCodeId),
      SampleCodeRepository.decrementLikeCount(sampleCodeId),
    ]);

    return this.buildResult(false, sampleCodeId);
  }

  /**
   * トグル結果を構築
   */
  private static async buildResult(
    liked: boolean,
    sampleCodeId: string
  ): Promise<ToggleLikeResult> {
    const updatedSample = await SampleCodeRepository.findByIdOrThrow(sampleCodeId);
    return {
      liked,
      likeCount: updatedSample.likeCount,
    };
  }

  /**
   * ユーザーがいいねしているかチェック
   */
  static async hasLiked(userId: string, sampleCodeId: string): Promise<boolean> {
    return SampleLikeRepository.existsByUserAndSample(userId, sampleCodeId);
  }

  /**
   * ユーザーがいいねしているサンプルIDのセットを取得
   */
  static async getLikedSampleIds(userId: string, sampleCodeIds: string[]): Promise<Set<string>> {
    const likes = await SampleLikeRepository.findByUserId(userId);
    const likedIds = new Set(likes.map(like => like.sampleCodeId));
    // フィルタ結果を直接返す（中間Set生成を削減）
    const result = new Set<string>();
    for (const id of sampleCodeIds) {
      if (likedIds.has(id)) {
        result.add(id);
      }
    }
    return result;
  }
}
