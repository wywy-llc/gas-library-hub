import {
  DEFAULT_SCRIPT_ID_PATTERNS,
  DEFAULT_WEB_APP_PATTERNS,
} from '$lib/constants/scraper-config.js';
import { GitHubApiUtils } from '$lib/server/utils/github-api-utils.js';

/** パターン検証結果の型定義 */
export interface PatternValidationResult {
  isValid: boolean;
  hasScriptId: boolean;
  hasWebAppPattern: boolean;
  error?: string;
}

/**
 * ライブラリのスクレイピングパターン検証サービス
 *
 * READMEからスクリプトIDまたはWebアプリパターンが検出できるかを検証し、
 * 最新のスクレイピング基準に適合しているかを判定します。
 */
export const ValidateLibraryPatternsService = (() => {
  /**
   * エラー結果を生成するヘルパー
   */
  const createErrorResult = (error: string): PatternValidationResult => ({
    isValid: false,
    hasScriptId: false,
    hasWebAppPattern: false,
    error,
  });

  /**
   * パターン配列に対してコンテンツがマッチするかを検証
   */
  const matchesAnyPattern = (content: string, patterns: RegExp[]): boolean => {
    return patterns.some(pattern => {
      pattern.lastIndex = 0; // RegExpをリセット
      return pattern.test(content);
    });
  };

  /**
   * ライブラリのGitHubリポジトリから最新のスクレイピングパターンに適合するかを検証
   *
   * @param repositoryUrl GitHubリポジトリURL
   * @returns 検証結果オブジェクト
   */
  const call = async (repositoryUrl: string): Promise<PatternValidationResult> => {
    try {
      // GitHubリポジトリURLをパース
      const parsedUrl = GitHubApiUtils.parseGitHubUrl(repositoryUrl);
      if (!parsedUrl) {
        return createErrorResult('Invalid GitHub repository URL');
      }

      const { owner, repo } = parsedUrl;

      // READMEを取得
      const readmeContent = await GitHubApiUtils.fetchReadme(owner, repo);
      if (!readmeContent) {
        return createErrorResult('README not found or could not be fetched');
      }

      // パターンを検証
      const hasScriptId = matchesAnyPattern(readmeContent, DEFAULT_SCRIPT_ID_PATTERNS);
      const hasWebAppPattern = matchesAnyPattern(readmeContent, DEFAULT_WEB_APP_PATTERNS);

      // スクリプトIDまたはWebアプリパターンのいずれかが検出された場合は有効
      return {
        isValid: hasScriptId || hasWebAppPattern,
        hasScriptId,
        hasWebAppPattern,
      };
    } catch (error) {
      console.error('Pattern validation error:', error);
      return createErrorResult(error instanceof Error ? error.message : 'Unknown validation error');
    }
  };

  return { call } as const;
})();
