import { generateId } from '$lib/server/utils/generate-id.js';
import { SampleLikeRepository } from '$lib/server/repositories/sample-like-repository.js';
import { SampleCodeRepository } from '$lib/server/repositories/sample-code-repository.js';
import { UserNotificationRepository } from '$lib/server/repositories/user-notification-repository.js';

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
    const sample = await SampleCodeRepository.findByIdOrThrow(sampleCodeId);
    const existingLike = await SampleLikeRepository.findByUserAndSample(userId, sampleCodeId);

    if (existingLike) {
      // いいね解除
      await SampleLikeRepository.delete(userId, sampleCodeId);
      await SampleCodeRepository.decrementLikeCount(sampleCodeId);

      const updatedSample = await SampleCodeRepository.findByIdOrThrow(sampleCodeId);
      return {
        liked: false,
        likeCount: updatedSample.likeCount,
      };
    } else {
      // いいね追加
      await SampleLikeRepository.create({
        id: generateId(),
        userId,
        sampleCodeId,
      });
      await SampleCodeRepository.incrementLikeCount(sampleCodeId);

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

      const updatedSample = await SampleCodeRepository.findByIdOrThrow(sampleCodeId);
      return {
        liked: true,
        likeCount: updatedSample.likeCount,
      };
    }
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
    return new Set(sampleCodeIds.filter(id => likedIds.has(id)));
  }
}
