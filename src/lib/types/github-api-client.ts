import type {
  GitHubRepository,
  GitHubTreeResponse,
  ScraperConfig,
  TagSearchResult,
} from '$lib/types/github-scraper.js';
import type { GitHubSearchSortOption } from '$lib/constants/github-search.js';

/**
 * GitHub API操作のインターフェース
 * 本番実装とモック実装で共通の契約を定義
 */
export interface GitHubApiClient {
  /**
   * 認証ヘッダーを生成
   * @returns 認証ヘッダー
   */
  createHeaders(): Record<string, string>;

  /**
   * リポジトリ情報を取得
   * @param owner リポジトリオーナー名
   * @param repo リポジトリ名
   * @returns リポジトリ情報
   */
  fetchRepositoryInfo(owner: string, repo: string): Promise<GitHubRepository>;

  /**
   * READMEファイルを取得
   * @param owner リポジトリオーナー名
   * @param repo リポジトリ名
   * @returns READMEの内容（取得できない場合はundefined）
   */
  fetchReadme(owner: string, repo: string): Promise<string | undefined>;

  /**
   * GASタグでリポジトリを検索（ページング対応）
   * @param config スクレイパー設定
   * @param maxResults 最大取得件数
   * @returns 検索結果
   */
  searchRepositoriesByTags(config: ScraperConfig, maxResults?: number): Promise<TagSearchResult>;

  /**
   * GASタグでリポジトリを検索（ページ範囲指定）
   * @param config スクレイパー設定
   * @param startPage 開始ページ
   * @param endPage 終了ページ
   * @param perPage 1ページあたりの件数
   * @param sortOption 並び順オプション
   * @returns ページ範囲指定検索結果
   */
  searchRepositoriesByPageRange(
    config: ScraperConfig,
    startPage: number,
    endPage: number,
    perPage: number,
    sortOption?: GitHubSearchSortOption
  ): Promise<TagSearchResult>;

  /**
   * リポジトリの最終コミット日時を取得
   * @param owner リポジトリオーナー名
   * @param repo リポジトリ名
   * @returns 最終コミット日時（取得できない場合はnull）
   */
  fetchLastCommitDate(owner: string, repo: string): Promise<Date | null>;

  /**
   * ファイル内容を取得
   * @param owner リポジトリオーナー名
   * @param repo リポジトリ名
   * @param path ファイルパス
   * @returns ファイル内容（取得できない場合はundefined）
   */
  fetchFileContent(owner: string, repo: string, path: string): Promise<string | undefined>;

  /**
   * リポジトリのファイルツリーを取得
   * @param owner リポジトリオーナー名
   * @param repo リポジトリ名
   * @param sha ツリーSHA（デフォルトはHEAD）
   * @param recursive 再帰的に取得するか（デフォルトはtrue）
   * @returns ファイルツリー（取得できない場合はundefined）
   */
  fetchRepositoryTree(
    owner: string,
    repo: string,
    sha?: string,
    recursive?: boolean
  ): Promise<GitHubTreeResponse | undefined>;
}
