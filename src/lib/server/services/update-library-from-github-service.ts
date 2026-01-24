import { db } from '$lib/server/db/index.js';
import { library } from '$lib/server/db/schema.js';
import { LibraryRepository } from '$lib/server/repositories/library-repository.js';
import { LibrarySummaryRepository } from '$lib/server/repositories/library-summary-repository.js';
import { GitHubApiUtils } from '$lib/server/utils/github-api-utils.js';
import { ServiceErrorUtil } from '$lib/server/utils/service-error-util.js';
import { eq } from 'drizzle-orm';
import { FetchGitHubRepoDataService } from './fetch-github-repo-data-service.js';
import { GenerateAiSummaryService } from './generate-ai-summary-service.js';
import { ScrapeGASLibraryService } from './scrape-gas-library-service.js';

/**
 * 更新が必要な変更を検出する型定義
 */
interface ChangeDetection {
  hasChanges: boolean;
  changedFields: string[];
  requiresAISummary: boolean;
}

/**
 * 変更検出用の新データ型定義
 */
interface NewLibraryData {
  name: string;
  description: string;
  authorName: string;
  authorUrl: string;
  repositoryUrl: string;
  starCount: number;
  licenseType: string;
  licenseUrl: string;
  scriptId: string;
  scriptType: string;
  lastCommitAt: Date;
}

/**
 * 比較対象フィールドの定義（AI要約が必要なフィールドを明示）
 */
const AI_SUMMARY_TRIGGER_FIELDS = new Set(['lastCommitAt', 'scriptId', 'scriptType']);

/**
 * GitHub リポジトリ情報を再取得するサービス
 *
 * 動作原理:
 * 1. 外部API呼び出しの並行実行による高速化
 * 2. 差分更新による不要なデータベース操作の削減
 * 3. 変更検出による条件付きAI要約生成
 * 4. エラーハンドリングの最適化
 */
export class UpdateLibraryFromGithubService {
  /**
   * 変更検出による差分更新の判定（最適化版）
   * - マッピングベースの比較でコード重複を削減
   * - Set使用でO(1)のフィールドチェック
   * @private
   */
  private static detectChanges(
    existingData: NewLibraryData,
    newData: NewLibraryData
  ): ChangeDetection {
    // 比較対象フィールドのマッピング（Date型以外）
    const stringFields = [
      'name',
      'description',
      'authorName',
      'authorUrl',
      'repositoryUrl',
      'licenseType',
      'licenseUrl',
      'scriptId',
      'scriptType',
    ] as const;

    const changedFields: string[] = [];

    // 文字列・数値フィールドの比較（ループで効率化）
    for (const field of stringFields) {
      if (existingData[field] !== newData[field]) {
        changedFields.push(field);
      }
    }

    // 数値フィールド
    if (existingData.starCount !== newData.starCount) {
      changedFields.push('starCount');
    }

    // Date型フィールドの比較（getTime()で数値比較）
    if (existingData.lastCommitAt.getTime() !== newData.lastCommitAt.getTime()) {
      changedFields.push('lastCommitAt');
    }

    // AI要約が必要かどうかをSet.has()でO(1)チェック
    const requiresAISummary = changedFields.some(field => AI_SUMMARY_TRIGGER_FIELDS.has(field));

    return {
      hasChanges: changedFields.length > 0,
      changedFields,
      requiresAISummary,
    };
  }

  /**
   * 外部API呼び出しを並行実行で最適化
   * @private
   */
  private static async fetchExternalData(repositoryUrl: string) {
    const parsedUrl = GitHubApiUtils.parseGitHubUrl(repositoryUrl);
    ServiceErrorUtil.assertCondition(
      !!parsedUrl,
      'GitHub リポジトリURLが正しくありません',
      'UpdateLibraryFromGithubService.fetchExternalData'
    );
    const { owner, repo } = parsedUrl!;

    // GitHub基本情報とスクレイピングを並行実行
    const [githubData, scrapeResult] = await Promise.allSettled([
      FetchGitHubRepoDataService.call(owner, repo),
      ScrapeGASLibraryService.call(repositoryUrl),
    ]);

    // 結果の検証
    if (githubData.status === 'rejected') {
      throw githubData.reason;
    }
    if (scrapeResult.status === 'rejected') {
      console.warn(`スクレイピング失敗: ${scrapeResult.reason} - 既存の値を保持します`);
    }

    return {
      githubData: githubData.value,
      scrapeResult: scrapeResult.status === 'fulfilled' ? scrapeResult.value : null,
    };
  }

  /**
   * GitHub APIから情報を再取得してライブラリを更新する（最適化版）
   * @param libraryId ライブラリID
   * @param options オプション設定
   */
  static async call(libraryId: string, options: { skipAiSummary?: boolean } = {}) {
    // ライブラリを取得（型ガードでnull assertionを排除）
    const libraryData = await LibraryRepository.findById(libraryId);
    ServiceErrorUtil.assertCondition(
      !!libraryData,
      'ライブラリが見つかりません。',
      'UpdateLibraryFromGithubService.call'
    );
    // assertCondition通過後はnon-nullが保証される
    const existingLibrary = libraryData!;

    // 外部データ取得とサマリー存在確認を並行実行
    const [externalData, summaryExists] = await Promise.all([
      this.fetchExternalData(existingLibrary.repositoryUrl),
      LibrarySummaryRepository.exists(libraryId),
    ]);

    const { githubData, scrapeResult } = externalData;
    const { repoInfo, licenseInfo, lastCommitAt } = githubData;

    // スクリプトID情報を取得（既存値をデフォルトに使用）
    let scriptId = existingLibrary.scriptId;
    let scriptType = existingLibrary.scriptType;

    if (scrapeResult?.success && scrapeResult.data) {
      const newScriptId = scrapeResult.data.scriptId;
      const newScriptType = scrapeResult.data.scriptType;

      // 変更があった場合のみログ出力
      if (newScriptId !== existingLibrary.scriptId) {
        console.log(`スクリプトID更新: ${existingLibrary.scriptId} → ${newScriptId}`);
        scriptId = newScriptId;
      }

      if (newScriptType !== existingLibrary.scriptType) {
        console.log(`スクリプトタイプ更新: ${existingLibrary.scriptType} → ${newScriptType}`);
        scriptType = newScriptType;
      }
    }

    // 新データオブジェクトを構築（detectChanges用）
    const newData: NewLibraryData = {
      name: repoInfo.name,
      description: repoInfo.description,
      authorName: repoInfo.authorName,
      authorUrl: repoInfo.authorUrl,
      repositoryUrl: repoInfo.repositoryUrl,
      starCount: repoInfo.starCount,
      licenseType: licenseInfo.type,
      licenseUrl: licenseInfo.url,
      scriptId,
      scriptType,
      lastCommitAt,
    };

    // 変更検出による差分更新判定（最適化されたシグネチャ）
    const changeDetection = this.detectChanges(existingLibrary, newData);

    // 変更がある場合のみデータベース更新
    if (changeDetection.hasChanges) {
      console.log(`更新フィールド: ${changeDetection.changedFields.join(', ')}`);

      await db
        .update(library)
        .set({
          name: newData.name,
          description: newData.description,
          authorName: newData.authorName,
          authorUrl: newData.authorUrl,
          repositoryUrl: newData.repositoryUrl,
          starCount: newData.starCount,
          licenseType: newData.licenseType,
          licenseUrl: newData.licenseUrl,
          lastCommitAt: newData.lastCommitAt,
          scriptId: newData.scriptId,
          scriptType: newData.scriptType as 'library' | 'web_app',
          updatedAt: new Date(),
        })
        .where(eq(library.id, libraryId));
    } else {
      console.log(`変更なし - データベース更新をスキップ: ${libraryId}`);
    }

    // AI要約生成判定（最適化された条件）
    const shouldGenerateSummary =
      !options.skipAiSummary && (changeDetection.requiresAISummary || !summaryExists);

    if (shouldGenerateSummary) {
      const reason = !summaryExists
        ? 'library_summaryが存在しないため'
        : changeDetection.changedFields.includes('lastCommitAt')
          ? 'lastCommitAtが変更されたため'
          : 'スクリプト情報が変更されたため';

      // バックグラウンドでAI要約生成（更新処理をブロックしない）
      GenerateAiSummaryService.callBackground({
        libraryId,
        githubUrl: newData.repositoryUrl,
        skipOnError: true,
        logContext: reason,
      });
    } else {
      console.log(`AI要約生成をスキップ: ${libraryId}`);
    }
  }

  /**
   * 指定されたライブラリのAI要約のみを生成する
   * @param libraryId ライブラリID
   */
  static async generateAiSummaryOnly(libraryId: string) {
    // ライブラリを取得
    const libraryData = await LibraryRepository.findById(libraryId);
    ServiceErrorUtil.assertCondition(
      !!libraryData,
      'ライブラリが見つかりません。',
      'UpdateLibraryFromGithubService.generateAiSummaryOnly'
    );

    // 手動生成の場合はエラーを上位に伝播
    await GenerateAiSummaryService.call({
      libraryId,
      githubUrl: libraryData!.repositoryUrl,
      skipOnError: false,
      logContext: '手動でAI要約を生成',
    });
  }
}
