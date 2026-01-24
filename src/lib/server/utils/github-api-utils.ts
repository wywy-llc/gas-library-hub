import type { GitHubSearchSortOption } from '$lib/constants/github-search.js';
import { GitHubApiClientFactory } from '$lib/server/factories/github-api-client-factory.js';
import type { GitHubApiClient } from '$lib/types/github-api-client.js';
import type {
  GitHubRepository,
  GitHubTreeResponse,
  ScraperConfig,
  TagSearchResult,
} from '$lib/types/github-scraper.js';

/**
 * GitHub API操作用ユーティリティクラス（リファクタリング版）
 * ファクトリーパターンを使用してモック実装と本番実装を分離
 */
export class GitHubApiUtils {
  private static client: GitHubApiClient;

  /**
   * GitHubApiClientインスタンスを取得
   * 初回呼び出し時にファクトリーから適切なクライアントを生成
   */
  private static getClient(): GitHubApiClient {
    if (!this.client) {
      this.client = GitHubApiClientFactory.build();
    }
    return this.client;
  }

  /**
   * GitHub API用の認証ヘッダーを生成
   * @returns 認証ヘッダー
   */
  public static createHeaders(): Record<string, string> {
    return this.getClient().createHeaders();
  }

  /**
   * GitHub APIからリポジトリ情報を取得
   * @param owner リポジトリオーナー名
   * @param repo リポジトリ名
   * @returns リポジトリ情報
   */
  public static async fetchRepositoryInfo(owner: string, repo: string): Promise<GitHubRepository> {
    return this.getClient().fetchRepositoryInfo(owner, repo);
  }

  /**
   * GitHub APIからREADMEを取得
   * @param owner リポジトリオーナー名
   * @param repo リポジトリ名
   * @returns READMEの内容（取得できない場合はundefined）
   */
  public static async fetchReadme(owner: string, repo: string): Promise<string | undefined> {
    return this.getClient().fetchReadme(owner, repo);
  }

  /**
   * GitHub Search APIでGASタグのリポジトリを検索（ページング対応）
   * @param config スクレイパー設定
   * @param maxResults 最大取得件数
   * @returns 検索結果
   */
  public static async searchRepositoriesByTags(
    config: ScraperConfig,
    maxResults: number = 10
  ): Promise<TagSearchResult> {
    return this.getClient().searchRepositoriesByTags(config, maxResults);
  }

  /**
   * GitHub Search APIでGASタグのリポジトリを検索（ページ範囲指定）
   * @param config スクレイパー設定
   * @param startPage 開始ページ
   * @param endPage 終了ページ
   * @param perPage 1ページあたりの件数
   * @param sortOption 並び順オプション
   * @returns ページ範囲指定検索結果
   */
  public static async searchRepositoriesByPageRange(
    config: ScraperConfig,
    startPage: number,
    endPage: number,
    perPage: number,
    sortOption?: GitHubSearchSortOption
  ): Promise<TagSearchResult> {
    return this.getClient().searchRepositoriesByPageRange(
      config,
      startPage,
      endPage,
      perPage,
      sortOption
    );
  }

  /**
   * GitHub URLからowner/repoを抽出
   * @param url GitHub URL
   * @returns owner/repo情報（パースできない場合はnull）
   */
  public static parseGitHubUrl(url: string): { owner: string; repo: string } | null {
    try {
      const urlObj = new URL(url);
      if (urlObj.hostname !== 'github.com') {
        return null;
      }

      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      if (pathParts.length < 2) {
        return null;
      }

      return {
        owner: pathParts[0],
        repo: pathParts[1].replace(/\.git$/, ''),
      };
    } catch {
      return null;
    }
  }

  /**
   * リポジトリの最終コミット日時を取得
   * @param owner リポジトリオーナー名
   * @param repo リポジトリ名
   * @returns 最終コミット日時（取得できない場合はnull）
   */
  public static async fetchLastCommitDate(owner: string, repo: string): Promise<Date | null> {
    return this.getClient().fetchLastCommitDate(owner, repo);
  }

  /**
   * ファイル内容を取得
   * @param owner リポジトリオーナー名
   * @param repo リポジトリ名
   * @param path ファイルパス
   * @returns ファイル内容（取得できない場合はundefined）
   */
  public static async fetchFileContent(
    owner: string,
    repo: string,
    path: string
  ): Promise<string | undefined> {
    return this.getClient().fetchFileContent(owner, repo, path);
  }

  /**
   * リポジトリのファイルツリーを取得
   * @param owner リポジトリオーナー名
   * @param repo リポジトリ名
   * @param sha ツリーSHA（デフォルトはHEAD）
   * @param recursive 再帰的に取得するか（デフォルトはtrue）
   * @returns ファイルツリー（取得できない場合はundefined）
   */
  public static async fetchRepositoryTree(
    owner: string,
    repo: string,
    sha?: string,
    recursive?: boolean
  ): Promise<GitHubTreeResponse | undefined> {
    return this.getClient().fetchRepositoryTree(owner, repo, sha, recursive);
  }
}
