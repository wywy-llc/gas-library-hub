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
   * 変更検出による差分更新の判定
   * @private
   */
  private static detectChanges(
    existingData: {
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
    },
    newRepoInfo: {
      name: string;
      description: string;
      authorName: string;
      authorUrl: string;
      repositoryUrl: string;
      starCount: number;
    },
    newLicenseInfo: {
      type: string;
      url: string;
    },
    newLastCommitAt: Date,
    newScriptId: string,
    newScriptType: string
  ): ChangeDetection {
    const changedFields: string[] = [];

    // 各フィールドの変更をチェック
    if (existingData.name !== newRepoInfo.name) changedFields.push('name');
    if (existingData.description !== newRepoInfo.description) changedFields.push('description');
    if (existingData.authorName !== newRepoInfo.authorName) changedFields.push('authorName');
    if (existingData.authorUrl !== newRepoInfo.authorUrl) changedFields.push('authorUrl');
    if (existingData.repositoryUrl !== newRepoInfo.repositoryUrl)
      changedFields.push('repositoryUrl');
    if (existingData.starCount !== newRepoInfo.starCount) changedFields.push('starCount');
    if (existingData.licenseType !== newLicenseInfo.type) changedFields.push('licenseType');
    if (existingData.licenseUrl !== newLicenseInfo.url) changedFields.push('licenseUrl');
    if (existingData.scriptId !== newScriptId) changedFields.push('scriptId');
    if (existingData.scriptType !== newScriptType) changedFields.push('scriptType');

    const hasCommitChanges = existingData.lastCommitAt.getTime() !== newLastCommitAt.getTime();
    if (hasCommitChanges) changedFields.push('lastCommitAt');

    return {
      hasChanges: changedFields.length > 0,
      changedFields,
      requiresAISummary:
        hasCommitChanges ||
        changedFields.includes('scriptId') ||
        changedFields.includes('scriptType'),
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
    // ライブラリを取得
    const libraryData = await LibraryRepository.findById(libraryId);
    ServiceErrorUtil.assertCondition(
      !!libraryData,
      'ライブラリが見つかりません。',
      'UpdateLibraryFromGithubService.call'
    );

    // 外部データ取得とサマリー存在確認を並行実行
    const [externalData, summaryExists] = await Promise.all([
      this.fetchExternalData(libraryData!.repositoryUrl),
      LibrarySummaryRepository.exists(libraryId),
    ]);

    const { githubData, scrapeResult } = externalData;
    const { repoInfo, licenseInfo, lastCommitAt } = githubData;

    // スクリプトID情報を取得（既存値をデフォルトに使用）
    let scriptId = libraryData!.scriptId;
    let scriptType = libraryData!.scriptType;

    if (scrapeResult?.success && scrapeResult.data) {
      const newScriptId = scrapeResult.data.scriptId;
      const newScriptType = scrapeResult.data.scriptType;

      // 変更があった場合のみログ出力
      if (newScriptId !== libraryData!.scriptId) {
        console.log(`スクリプトID更新: ${libraryData!.scriptId} → ${newScriptId}`);
        scriptId = newScriptId;
      }

      if (newScriptType !== libraryData!.scriptType) {
        console.log(`スクリプトタイプ更新: ${libraryData!.scriptType} → ${newScriptType}`);
        scriptType = newScriptType;
      }
    }

    // 変更検出による差分更新判定
    const changeDetection = this.detectChanges(
      libraryData!,
      repoInfo,
      licenseInfo,
      lastCommitAt,
      scriptId,
      scriptType
    );

    // 変更がある場合のみデータベース更新
    if (changeDetection.hasChanges) {
      console.log(`更新フィールド: ${changeDetection.changedFields.join(', ')}`);

      await db
        .update(library)
        .set({
          name: repoInfo.name,
          description: repoInfo.description,
          authorName: repoInfo.authorName,
          authorUrl: repoInfo.authorUrl,
          repositoryUrl: repoInfo.repositoryUrl,
          starCount: repoInfo.starCount,
          licenseType: licenseInfo.type,
          licenseUrl: licenseInfo.url,
          lastCommitAt: lastCommitAt,
          scriptId: scriptId,
          scriptType: scriptType,
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
        githubUrl: repoInfo.repositoryUrl,
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
