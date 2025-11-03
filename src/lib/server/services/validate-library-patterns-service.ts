import {
  DEFAULT_SCRIPT_ID_PATTERNS,
  DEFAULT_WEB_APP_PATTERNS,
} from '$lib/constants/scraper-config.js';
import { GitHubApiUtils } from '$lib/server/utils/github-api-utils.js';

/**
 * ライブラリのスクレイピングパターン検証サービス
 *
 * READMEからスクリプトIDまたはWebアプリパターンが検出できるかを検証し、
 * 最新のスクレイピング基準に適合しているかを判定します。
 */
export const ValidateLibraryPatternsService = (() => {
  /**
   * ライブラリのGitHubリポジトリから最新のスクレイピングパターンに適合するかを検証
   *
   * @param repositoryUrl GitHubリポジトリURL
   * @returns 検証結果オブジェクト
   */
  const call = async (repositoryUrl: string): Promise<{
    isValid: boolean;
    hasScriptId: boolean;
    hasWebAppPattern: boolean;
    error?: string;
  }> => {
    try {
      // GitHubリポジトリURLをパース
      const parsedUrl = GitHubApiUtils.parseGitHubUrl(repositoryUrl);
      if (!parsedUrl) {
        return {
          isValid: false,
          hasScriptId: false,
          hasWebAppPattern: false,
          error: 'Invalid GitHub repository URL',
        };
      }

      const { owner, repo } = parsedUrl;

      // READMEを取得
      const readmeContent = await GitHubApiUtils.fetchReadme(owner, repo);
      if (!readmeContent) {
        return {
          isValid: false,
          hasScriptId: false,
          hasWebAppPattern: false,
          error: 'README not found or could not be fetched',
        };
      }

      // スクリプトIDパターンを検証
      let hasScriptId = false;
      for (const pattern of DEFAULT_SCRIPT_ID_PATTERNS) {
        pattern.lastIndex = 0; // RegExpをリセット
        if (pattern.test(readmeContent)) {
          hasScriptId = true;
          break;
        }
      }

      // Webアプリパターンを検証
      let hasWebAppPattern = false;
      for (const pattern of DEFAULT_WEB_APP_PATTERNS) {
        pattern.lastIndex = 0; // RegExpをリセット
        if (pattern.test(readmeContent)) {
          hasWebAppPattern = true;
          break;
        }
      }

      // スクリプトIDまたはWebアプリパターンのいずれかが検出された場合は有効
      const isValid = hasScriptId || hasWebAppPattern;

      return {
        isValid,
        hasScriptId,
        hasWebAppPattern,
      };
    } catch (error) {
      console.error('Pattern validation error:', error);
      return {
        isValid: false,
        hasScriptId: false,
        hasWebAppPattern: false,
        error: error instanceof Error ? error.message : 'Unknown validation error',
      };
    }
  };

  return { call } as const;
})();
