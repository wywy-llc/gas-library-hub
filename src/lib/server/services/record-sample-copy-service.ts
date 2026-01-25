import { generateId } from '$lib/server/utils/generate-id.js';
import { SampleCopyRepository } from '$lib/server/repositories/sample-copy-repository.js';
import { SampleCodeRepository } from '$lib/server/repositories/sample-code-repository.js';
import { UserNotificationRepository } from '$lib/server/repositories/user-notification-repository.js';

/**
 * コピー記録結果
 */
export interface RecordCopyResult {
  copyCount: number;
  copyUrl: string;
}

/**
 * サンプルコードのコピーを記録するサービス
 *
 * 機能:
 * - コピー履歴の記録
 * - コピー数の更新
 * - 投稿者への通知作成
 */
export class RecordSampleCopyService {
  /**
   * コピーを記録
   *
   * @param sampleCodeId サンプルコードID
   * @param userId ユーザーID（未ログインの場合はnull）
   * @param sessionId セッションID（匿名ユーザー識別用）
   * @returns 記録結果（現在のコピー数とコピーURL）
   *
   * @example
   * ```typescript
   * // ログインユーザー
   * const result = await RecordSampleCopyService.record('sample123', 'user456', null);
   *
   * // 未ログインユーザー
   * const result = await RecordSampleCopyService.record('sample123', null, 'session789');
   * ```
   */
  static async record(
    sampleCodeId: string,
    userId: string | null,
    sessionId: string | null
  ): Promise<RecordCopyResult> {
    const sample = await SampleCodeRepository.findByIdOrThrow(sampleCodeId);

    // コピー履歴を記録
    await SampleCopyRepository.create({
      id: generateId(),
      sampleCodeId,
      userId,
      sessionId,
    });

    // コピー数をインクリメント
    await SampleCodeRepository.incrementCopyCount(sampleCodeId);

    // 投稿者への通知（自分自身のコピーは通知しない、ログインユーザーのみ通知）
    if (userId && sample.authorId !== userId) {
      await UserNotificationRepository.create({
        id: generateId(),
        userId: sample.authorId,
        type: 'copy',
        sampleCodeId,
        actorId: userId,
        metadata: {},
      });
    }

    const updatedSample = await SampleCodeRepository.findByIdOrThrow(sampleCodeId);
    return {
      copyCount: updatedSample.copyCount,
      copyUrl: updatedSample.copyUrl,
    };
  }

  /**
   * サンプルのコピーURLを取得（記録なし）
   */
  static async getCopyUrl(sampleCodeId: string): Promise<string> {
    const sample = await SampleCodeRepository.findByIdOrThrow(sampleCodeId);
    return sample.copyUrl;
  }
}
