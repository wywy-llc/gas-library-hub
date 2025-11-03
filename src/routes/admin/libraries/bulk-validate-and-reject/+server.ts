import { LIBRARY_STATUS } from '$lib/constants/library-status.js';
import { db } from '$lib/server/db/index.js';
import { library } from '$lib/server/db/schema.js';
import { ValidateLibraryPatternsService } from '$lib/server/services/validate-library-patterns-service.js';
import { json, type RequestHandler } from '@sveltejs/kit';
import { ne, eq } from 'drizzle-orm';

/**
 * 既存ライブラリの一括検証・却下処理APIエンドポイント
 *
 * 最新のスクレイピングパターンに適合しないライブラリを自動的に却下ステータスに更新します。
 */
export const POST: RequestHandler = async () => {
  try {
    console.log('🔍 既存ライブラリの一括パターン検証を開始...');

    // 却下以外のすべてのライブラリを取得
    const libraries = await db
      .select({
        id: library.id,
        name: library.name,
        repositoryUrl: library.repositoryUrl,
        status: library.status,
      })
      .from(library)
      .where(ne(library.status, LIBRARY_STATUS.REJECTED));

    console.log(`📋 検証対象ライブラリ数: ${libraries.length}件`);

    let processedCount = 0;
    let rejectedCount = 0;
    let validCount = 0;
    let errorCount = 0;
    const rejectedLibraries: Array<{ id: string; name: string; reason: string }> = [];
    const librariesToReject: Array<{ id: string; reason: string }> = [];

    // バッチサイズを設定（GitHub API Rate Limitを考慮）
    const BATCH_SIZE = 10;
    const DELAY_BETWEEN_BATCHES = 2000; // バッチ間の待機時間（ミリ秒）

    // ライブラリをバッチに分割
    for (let i = 0; i < libraries.length; i += BATCH_SIZE) {
      const batch = libraries.slice(i, i + BATCH_SIZE);
      console.log(
        `🔄 バッチ処理中 (${i + 1}-${Math.min(i + BATCH_SIZE, libraries.length)}/${libraries.length})`
      );

      // バッチ内のライブラリを並列処理
      const batchResults = await Promise.allSettled(
        batch.map(async lib => {
          try {
            // パターン検証を実行
            const validationResult = await ValidateLibraryPatternsService.call(lib.repositoryUrl);

            if (!validationResult.isValid) {
              const reason =
                validationResult.error ||
                'スクリプトIDまたはWebアプリパターンが検出されませんでした';

              // 却下対象として記録
              librariesToReject.push({ id: lib.id, reason });
              rejectedLibraries.push({
                id: lib.id,
                name: lib.name,
                reason,
              });

              console.log(`❌ 却下: ${lib.name} - ${reason}`);
              return { status: 'rejected', lib, reason };
            } else {
              console.log(`✅ 有効: ${lib.name}`);
              return { status: 'valid', lib };
            }
          } catch (error) {
            console.error(`❌ 検証エラー: ${lib.name}`, error);
            return { status: 'error', lib, error };
          }
        })
      );

      // 結果を集計
      for (const result of batchResults) {
        processedCount++;
        if (result.status === 'fulfilled') {
          const value = result.value;
          if (value.status === 'rejected') {
            rejectedCount++;
          } else if (value.status === 'valid') {
            validCount++;
          } else if (value.status === 'error') {
            errorCount++;
          }
        } else {
          errorCount++;
        }
      }

      // 次のバッチまで待機（最後のバッチは待機不要）
      if (i + BATCH_SIZE < libraries.length) {
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
      }
    }

    // 却下対象のライブラリをバッチで一括更新
    if (librariesToReject.length > 0) {
      console.log(`📝 ${librariesToReject.length}件のライブラリを却下ステータスに更新中...`);

      // Drizzle ORMでバッチ更新を実行
      // 注: Drizzle ORMではバッチ更新が直接サポートされていないため、
      // トランザクション内で複数の更新を実行
      await db.transaction(async tx => {
        for (const { id } of librariesToReject) {
          await tx
            .update(library)
            .set({
              status: LIBRARY_STATUS.REJECTED,
              updatedAt: new Date(),
            })
            .where(eq(library.id, id));
        }
      });

      console.log(`✅ ${librariesToReject.length}件のライブラリを更新完了`);
    }

    const response = {
      success: true,
      message: `一括検証が完了しました。処理: ${processedCount}件、有効: ${validCount}件、却下: ${rejectedCount}件、エラー: ${errorCount}件`,
      summary: {
        total: libraries.length,
        processed: processedCount,
        valid: validCount,
        rejected: rejectedCount,
        errors: errorCount,
      },
      rejectedLibraries,
    };

    console.log('✅ 一括検証完了:', response.message);

    return json(response);
  } catch (error) {
    console.error('❌ 一括検証エラー:', error);

    return json(
      {
        success: false,
        message: '一括検証中にエラーが発生しました。',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
};
