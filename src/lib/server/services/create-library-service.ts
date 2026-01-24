import { ERROR_MESSAGES } from '$lib/constants/error-messages.js';
import { testConnection } from '$lib/server/db/index.js';
import { LibraryRepository } from '$lib/server/repositories/library-repository.js';
import { GasScriptValidator } from '$lib/server/utils/gas-script-validator.js';
import { GitHubApiUtils } from '$lib/server/utils/github-api-utils.js';
import { ServiceErrorUtil } from '$lib/server/utils/service-error-util.js';
import { nanoid } from 'nanoid';
import { FetchGitHubRepoDataService } from './fetch-github-repo-data-service.js';
import { GenerateAiSummaryService } from './generate-ai-summary-service.js';
import { ValidateLibraryUniquenessService } from './validate-library-uniqueness-service.js';

/**
 * ライブラリを新規作成するサービス
 * GitHub APIから情報を取得してデータベースに保存する
 */
export const CreateLibraryService = (() => {
  /**
   * ライブラリを新規作成する
   * @param params 作成パラメータ
   * @returns 作成されたライブラリのID
   */
  const call = async (params: { scriptId: string; repoUrl: string }): Promise<string> => {
    // GitHub URLを正規化
    const repositoryUrl = params.repoUrl.startsWith('https://github.com/')
      ? params.repoUrl
      : `https://github.com/${params.repoUrl}`;

    // GitHub URLを解析
    const parsedUrl = GitHubApiUtils.parseGitHubUrl(repositoryUrl);
    ServiceErrorUtil.assertCondition(
      !!parsedUrl,
      'GitHub リポジトリURLが正しくありません',
      'CreateLibraryService.call'
    );
    const { owner, repo } = parsedUrl!;

    // データベース接続テスト
    const isConnected = await testConnection();
    ServiceErrorUtil.assertCondition(
      isConnected,
      ERROR_MESSAGES.DATABASE_CONNECTION_FAILED,
      'CreateLibraryService.call'
    );

    // 重複チェック
    await ValidateLibraryUniquenessService.call(params.scriptId, repositoryUrl);

    // GitHub から情報を取得 + スクリプトID検証を並列実行
    const [githubData, validationResult] = await Promise.all([
      FetchGitHubRepoDataService.call(owner, repo),
      // ライブラリ形式のスクリプトID（1から始まる）のみ検証
      params.scriptId.startsWith('1')
        ? GasScriptValidator.validate(params.scriptId)
        : Promise.resolve(null),
    ]);

    const { repoInfo, licenseInfo, lastCommitAt } = githubData;

    // ライブラリを作成
    const libraryId = nanoid();

    // スクリプトタイプを決定（not_foundの場合はWebアプリとして扱う）
    const scriptType = validationResult?.status === 'not_found' ? 'web_app' : 'library';

    // データベースに保存
    const createdLibrary = await LibraryRepository.create({
      id: libraryId,
      name: repoInfo.name,
      scriptId: params.scriptId,
      repositoryUrl: repoInfo.repositoryUrl,
      authorUrl: repoInfo.authorUrl,
      authorName: repoInfo.authorName,
      description: repoInfo.description,
      starCount: repoInfo.starCount,
      copyCount: 0,
      licenseType: licenseInfo.type,
      licenseUrl: licenseInfo.url,
      lastCommitAt: lastCommitAt,
      status: 'pending',
      scriptType,
      scriptValidationStatus: validationResult?.status ?? undefined,
      requesterId: undefined,
      requestNote: undefined,
    });

    console.log('📚 ライブラリ作成完了:', {
      id: createdLibrary.id,
      name: createdLibrary.name,
      author: createdLibrary.authorName,
      description: createdLibrary.description,
      starCount: createdLibrary.starCount,
    });

    // AI要約生成をバックグラウンドで実行（Fire-and-Forget）
    // callBackgroundメソッドを使用することで、Vercel環境でも確実にバックグラウンド実行される
    GenerateAiSummaryService.callBackground({
      libraryId,
      githubUrl: repositoryUrl,
      skipOnError: true,
      logContext: '新規ライブラリのAI要約を生成',
    });

    console.log('⚡ ライブラリ登録完了（AI要約はバックグラウンドで生成中）');

    return libraryId;
  };

  return { call } as const;
})();
