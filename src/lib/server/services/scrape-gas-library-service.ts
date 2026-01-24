import { DEFAULT_WEB_APP_PATTERNS } from '$lib/constants/scraper-config.js';
import { ErrorUtils } from '$lib/server/utils/error-utils.js';
import { GASScriptIdExtractor } from '$lib/server/utils/gas-script-id-extractor.js';
import { GitHubApiUtils } from '$lib/server/utils/github-api-utils.js';
import type { ScrapedLibraryData, ScrapeResult } from '$lib/types/github-scraper.js';

/**
 * 解析結果のキャッシュ型定義
 */
interface ParsedResults {
  webAppInfo: { scriptId: string; scriptType: 'web_app' } | null;
  extractedScriptId: string | undefined;
  webAppFromGsFiles: 'web_app' | null;
}

/**
 * GASライブラリスクレイピングサービス
 * 単一のGitHubリポジトリからライブラリ情報をスクレイピングし、データベース形式に変換する
 *
 * 使用例:
 * const result = await ScrapeGASLibraryService.call('https://github.com/owner/repo');
 *
 * 動作原理:
 * 1. 事前コンパイルされた正規表現でパフォーマンス最適化
 * 2. 早期終了による不要な処理のスキップ
 * 3. GitHubAPIの並行処理による高速化
 * 4. README解析の並行処理による効率化
 */
export class ScrapeGASLibraryService {
  /** WebアプリスクリプトIDの最小長 */
  private static readonly MIN_SCRIPT_ID_LENGTH = 10;

  // 正規表現の事前コンパイル（パフォーマンス最適化）
  private static readonly WEB_APP_URL_PATTERN =
    /https:\/\/script\.google\.com\/(?:a\/)?macros\/(?:[^/]+\/)?s\/([A-Za-z0-9_-]+)\/exec/g;

  // 事前コンパイル済みの.gsファイル検出パターン
  private static readonly COMPILED_WEB_APP_PATTERNS = DEFAULT_WEB_APP_PATTERNS;
  /**
   * READMEからGAS WebアプリのURLを検出する（最適化版）
   *
   * @param readmeContent - README文字列
   * @returns 検出されたscriptIdとscriptType、または null
   */
  private static extractWebAppInfo(
    readmeContent: string
  ): { scriptId: string; scriptType: 'web_app' } | null {
    // matchAll()は内部でlastIndexをリセットするため手動リセット不要
    const matches = readmeContent.matchAll(this.WEB_APP_URL_PATTERN);

    for (const match of matches) {
      const scriptId = match[1]; // グループキャプチャから直接取得

      // 基本的な検証のみ実行して高速化
      if (scriptId && scriptId.length > this.MIN_SCRIPT_ID_LENGTH) {
        return { scriptId, scriptType: 'web_app' };
      }
    }

    return null;
  }

  /**
   * READMEに.gsファイルの記載があるかチェックし、Web Appとして検知する
   *
   * @param readmeContent - README文字列
   * @returns .gsファイルが見つかればweb_app、そうでなければnull
   */
  private static detectWebAppFromGsFiles(readmeContent: string): 'web_app' | null {
    // some()で早期終了を保証（最初のマッチで即座にtrue返却）
    const found = this.COMPILED_WEB_APP_PATTERNS.some(pattern => pattern.test(readmeContent));
    return found ? 'web_app' : null;
  }

  /**
   * README解析を実行する
   * @private
   */
  private static parseReadmeContent(readmeContent: string): ParsedResults {
    return {
      webAppInfo: this.extractWebAppInfo(readmeContent),
      extractedScriptId: GASScriptIdExtractor.extractScriptId(readmeContent),
      webAppFromGsFiles: this.detectWebAppFromGsFiles(readmeContent),
    };
  }

  /**
   * スクリプトIDとタイプを決定する
   * 優先順位: ライブラリID > WebアプリURL > .gsファイル検出
   * @private
   */
  private static determineScriptInfo(
    libraryScriptId: string | undefined,
    webAppInfo: { scriptId: string; scriptType: 'web_app' } | null,
    webAppFromGsFiles: 'web_app' | null,
    owner: string,
    repo: string
  ): { scriptId: string | undefined; scriptType: 'library' | 'web_app' } {
    // ライブラリIDがある場合は常にライブラリとして分類（WebアプリURLがあっても）
    if (libraryScriptId) {
      return { scriptId: libraryScriptId, scriptType: 'library' };
    }

    // WebアプリURLがある場合
    if (webAppInfo) {
      return { scriptId: webAppInfo.scriptId, scriptType: 'web_app' };
    }

    // .gsファイルが検出された場合
    if (webAppFromGsFiles) {
      return { scriptId: `${owner}/${repo}`, scriptType: 'web_app' };
    }

    // 何も検出されなかった場合
    return { scriptId: undefined, scriptType: 'library' };
  }

  /**
   * 単一のGitHubリポジトリからライブラリ情報をスクレイピング
   *
   * @param repositoryUrl - GitHubリポジトリURL
   * @returns スクレイピング結果
   */
  public static async call(repositoryUrl: string): Promise<ScrapeResult> {
    try {
      // GitHub URLの解析
      const parsed = GitHubApiUtils.parseGitHubUrl(repositoryUrl);
      if (!parsed) {
        return {
          success: false,
          error: '無効なGitHub URLです',
        };
      }

      const { owner, repo } = parsed;

      // リポジトリ情報、README、最終コミット日時を並行取得
      const [repoInfo, readmeContent, lastCommitAt] = await Promise.all([
        GitHubApiUtils.fetchRepositoryInfo(owner, repo),
        GitHubApiUtils.fetchReadme(owner, repo),
        GitHubApiUtils.fetchLastCommitDate(owner, repo),
      ]);

      let scriptId: string | undefined;
      let scriptType: 'library' | 'web_app' = 'library';

      if (readmeContent) {
        // README解析を実行
        const { webAppInfo, extractedScriptId, webAppFromGsFiles } =
          this.parseReadmeContent(readmeContent);

        // ライブラリ形式のスクリプトID判定（1から始まるIDのみ）
        const libraryScriptId = extractedScriptId?.startsWith('1') ? extractedScriptId : undefined;

        // scriptIdとscriptTypeを決定
        // 優先順位: ライブラリID > WebアプリURL > .gsファイル検出
        ({ scriptId, scriptType } = this.determineScriptInfo(
          libraryScriptId,
          webAppInfo,
          webAppFromGsFiles,
          owner,
          repo
        ));
      }

      if (!scriptId) {
        return {
          success: false,
          error:
            'READMEからGASスクリプトIDまたはWebアプリURL、.gsファイルの記載が見つかりませんでした',
        };
      }

      if (!lastCommitAt) {
        return {
          success: false,
          error: '最終コミット日時の取得に失敗しました',
        };
      }

      // データベース形式に変換
      const libraryData: ScrapedLibraryData = {
        name: repoInfo.name,
        scriptId,
        repositoryUrl: repoInfo.html_url,
        authorUrl: repoInfo.owner.html_url,
        authorName: repoInfo.owner.login,
        description: repoInfo.description || '',
        licenseType: repoInfo.license?.name,
        licenseUrl: repoInfo.license?.url,
        starCount: repoInfo.stargazers_count,
        lastCommitAt: lastCommitAt,
        status: 'pending',
        scriptType,
      };

      return {
        success: true,
        data: libraryData,
      };
    } catch (error) {
      console.error('スクレイピングエラー:', error);
      return {
        success: false,
        error: ErrorUtils.getMessage(error, 'スクレイピングに失敗しました'),
      };
    }
  }
}
