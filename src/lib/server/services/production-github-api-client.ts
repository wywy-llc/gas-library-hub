import { GITHUB_TOKEN } from '$env/static/private';
import type { GitHubSearchSortOption } from '$lib/constants/github-search.js';
import { GITHUB_SEARCH_SORT_OPTIONS } from '$lib/constants/github-search.js';
import { ErrorUtils } from '$lib/server/utils/error-utils.js';
import type { GitHubApiClient } from '$lib/types/github-api-client.js';
import type {
  GitHubContentResponse,
  GitHubReadmeResponse,
  GitHubRepository,
  GitHubSearchResponse,
  GitHubTreeResponse,
  ScraperConfig,
  TagSearchResult,
} from '$lib/types/github-scraper.js';

/**
 * インメモリキャッシュアイテムの型定義
 */
interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * タグ検証結果
 */
interface TagValidationResult {
  isValid: boolean;
  validTags: string[];
  errorResult?: TagSearchResult;
}

/**
 * 本番環境用のGitHub API クライアント
 * 実際のGitHub APIを呼び出す実装
 *
 * 動作原理:
 * 1. インメモリキャッシュによる重複API呼び出しの削減（TTL付き）
 * 2. レート制限時の動的待機時間調整
 * 3. エクスポネンシャルバックオフによるリトライ機能
 * 4. 適応的待機時間によるパフォーマンス最適化
 */
export class ProductionGitHubApiClient implements GitHubApiClient {
  private static readonly GITHUB_API_BASE = 'https://api.github.com';
  private static readonly DEFAULT_CACHE_TTL = 5 * 60 * 1000; // 5分
  private static readonly RATE_LIMIT_CACHE_TTL = 60 * 1000; // 1分（レート制限時）
  private static readonly MAX_RETRIES = 3;
  private static readonly BASE_RETRY_DELAY = 1000; // 1秒
  private static readonly MAX_CACHE_SIZE = 1000;

  // インメモリキャッシュ（静的プロパティで全インスタンス共有）
  private static cache = new Map<string, CacheItem<unknown>>();

  /**
   * キャッシュからデータを取得
   * @private
   */
  private static getFromCache<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    const now = Date.now();
    if (now - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data as T;
  }

  /**
   * データをキャッシュに保存
   * @private
   */
  private static setCache<T>(key: string, data: T, ttl: number = this.DEFAULT_CACHE_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });

    // キャッシュサイズが上限を超えた場合、古いエントリを削除
    if (this.cache.size > this.MAX_CACHE_SIZE) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }
  }

  /**
   * エクスポネンシャルバックオフによるリトライ機能付きfetch
   * @private
   */
  private static async fetchWithRetry(
    url: string,
    options: RequestInit,
    retryCount: number = 0
  ): Promise<Response> {
    try {
      const response = await fetch(url, options);

      // レート制限の場合
      if (response.status === 429) {
        // Retry-Afterヘッダーがある場合はそれを使用、なければ計算
        const retryAfter = response.headers.get('Retry-After');
        const waitTime = retryAfter
          ? parseInt(retryAfter) * 1000
          : this.BASE_RETRY_DELAY * Math.pow(2, retryCount);

        if (retryCount < this.MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, waitTime));
          return this.fetchWithRetry(url, options, retryCount + 1);
        }
      }

      // その他の5xx系エラーでリトライ
      if (response.status >= 500 && response.status < 600 && retryCount < this.MAX_RETRIES) {
        const waitTime = this.BASE_RETRY_DELAY * Math.pow(2, retryCount);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return this.fetchWithRetry(url, options, retryCount + 1);
      }

      return response;
    } catch (error) {
      if (retryCount < this.MAX_RETRIES) {
        const waitTime = this.BASE_RETRY_DELAY * Math.pow(2, retryCount);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return this.fetchWithRetry(url, options, retryCount + 1);
      }
      throw error;
    }
  }

  /**
   * GitHub API用の認証ヘッダーを生成
   * @returns 認証ヘッダー
   */
  createHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'app-script-hub',
      'X-GitHub-Api-Version': '2022-11-28',
    };

    if (!GITHUB_TOKEN) {
      throw new Error(
        'GITHUB_TOKENが設定されていません。GitHub APIへのアクセスには認証トークンが必要です。'
      );
    }
    headers['Authorization'] = `token ${GITHUB_TOKEN}`;

    return headers;
  }

  /**
   * GitHub APIからリポジトリ情報を取得（キャッシュ機能付き）
   * @param owner リポジトリオーナー名
   * @param repo リポジトリ名
   * @returns リポジトリ情報
   */
  async fetchRepositoryInfo(owner: string, repo: string): Promise<GitHubRepository> {
    const cacheKey = `repo:${owner}/${repo}`;

    // キャッシュから取得を試行
    const cached = ProductionGitHubApiClient.getFromCache<GitHubRepository>(cacheKey);
    if (cached) {
      return cached;
    }

    const headers = this.createHeaders();
    const url = `${ProductionGitHubApiClient.GITHUB_API_BASE}/repos/${owner}/${repo}`;

    const response = await ProductionGitHubApiClient.fetchWithRetry(url, { headers });

    if (!response.ok) {
      throw new Error(`GitHub API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // 成功時はキャッシュに保存
    ProductionGitHubApiClient.setCache(cacheKey, data);

    return data;
  }

  /**
   * GitHub APIからREADMEを取得
   * @param owner リポジトリオーナー名
   * @param repo リポジトリ名
   * @returns READMEの内容（取得できない場合はundefined）
   */
  async fetchReadme(owner: string, repo: string): Promise<string | undefined> {
    const cacheKey = `readme:${owner}/${repo}`;

    // キャッシュから取得を試行
    const cached = ProductionGitHubApiClient.getFromCache<string>(cacheKey);
    if (cached !== null) {
      return cached || undefined;
    }

    try {
      const headers = this.createHeaders();
      const url = `${ProductionGitHubApiClient.GITHUB_API_BASE}/repos/${owner}/${repo}/readme`;

      const response = await ProductionGitHubApiClient.fetchWithRetry(url, { headers });

      if (!response.ok) {
        ProductionGitHubApiClient.setCache(
          cacheKey,
          '',
          ProductionGitHubApiClient.RATE_LIMIT_CACHE_TTL
        );
        return undefined;
      }

      const readmeData: GitHubReadmeResponse = await response.json();
      const content = ProductionGitHubApiClient.decodeBase64Content(
        readmeData.content,
        readmeData.encoding
      );

      ProductionGitHubApiClient.setCache(cacheKey, content);
      return content;
    } catch (error) {
      console.warn('README取得に失敗:', error);
      ProductionGitHubApiClient.setCache(
        cacheKey,
        '',
        ProductionGitHubApiClient.RATE_LIMIT_CACHE_TTL
      );
      return undefined;
    }
  }

  /**
   * GitHub Search APIでGASタグのリポジトリを検索（ページング対応）
   * @param config スクレイパー設定
   * @param maxResults 最大取得件数
   * @returns 検索結果
   */
  async searchRepositoriesByTags(
    config: ScraperConfig,
    maxResults: number = 10
  ): Promise<TagSearchResult> {
    try {
      const validation = ProductionGitHubApiClient.validateAndBuildQuery(config);
      if (!validation.isValid) {
        return validation.errorResult!;
      }

      const query = ProductionGitHubApiClient.buildSearchQuery(validation.validTags);
      const apiMaxResults = Math.min(maxResults, 1000);
      const perPage = 100;
      const totalPages = Math.ceil(apiMaxResults / perPage);

      ProductionGitHubApiClient.logVerbose(config.verbose, 'Original gasTags:', config.gasTags);
      ProductionGitHubApiClient.logVerbose(
        config.verbose,
        'Valid tags:',
        validation.validTags.slice(0, 5)
      );
      ProductionGitHubApiClient.logVerbose(config.verbose, 'GitHub Search Query:', query);
      ProductionGitHubApiClient.logVerbose(
        config.verbose,
        `取得予定件数: ${apiMaxResults}件 (${totalPages}ページ)`
      );

      let allRepositories: GitHubRepository[] = [];
      let totalFound = 0;

      for (let page = 1; page <= totalPages; page++) {
        const remainingResults = apiMaxResults - allRepositories.length;
        const pageSize = Math.min(perPage, remainingResults);

        const searchUrl = `${ProductionGitHubApiClient.GITHUB_API_BASE}/search/repositories?q=${encodeURIComponent(
          query
        )}&sort=stars&order=desc&per_page=${pageSize}&page=${page}`;

        ProductionGitHubApiClient.logVerbose(
          config.verbose,
          `ページ ${page}/${totalPages} を検索中: ${searchUrl}`
        );

        const headers = this.createHeaders();
        const response = await fetch(searchUrl, { headers });

        if (!response.ok) {
          const errorDetails = await ProductionGitHubApiClient.parseApiError(response);
          throw new Error(`GitHub Search API Error: ${errorDetails}`);
        }

        const searchResult: GitHubSearchResponse = await response.json();

        if (page === 1) {
          totalFound = searchResult.total_count;
        }

        allRepositories.push(...searchResult.items);

        ProductionGitHubApiClient.logVerbose(
          config.verbose,
          `ページ ${page}: ${searchResult.items.length}件取得 (累計: ${allRepositories.length}件)`
        );

        if (allRepositories.length >= apiMaxResults || searchResult.items.length === 0) {
          break;
        }
      }

      if (allRepositories.length > maxResults) {
        allRepositories = allRepositories.slice(0, maxResults);
      }

      return {
        success: true,
        repositories: allRepositories,
        totalFound,
        processedCount: allRepositories.length,
      };
    } catch (error) {
      console.error('GitHub Search エラー:', error);

      if (error instanceof Error && error.message.includes('422')) {
        ProductionGitHubApiClient.logVerbose(config.verbose, 'フォールバック検索を実行中...');
        return this.fallbackSearch(maxResults, config.verbose);
      }

      return {
        success: false,
        repositories: [],
        totalFound: 0,
        processedCount: 0,
        error: ErrorUtils.getMessage(error, 'GitHub検索に失敗しました'),
      };
    }
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
  async searchRepositoriesByPageRange(
    config: ScraperConfig,
    startPage: number,
    endPage: number,
    perPage: number,
    sortOption?: GitHubSearchSortOption
  ): Promise<TagSearchResult> {
    try {
      const validation = ProductionGitHubApiClient.validateAndBuildQuery(config);
      if (!validation.isValid) {
        return validation.errorResult!;
      }

      const query = ProductionGitHubApiClient.buildSearchQuery(validation.validTags);
      const sortParams = sortOption
        ? GITHUB_SEARCH_SORT_OPTIONS[sortOption]
        : GITHUB_SEARCH_SORT_OPTIONS.UPDATED_DESC;

      const totalPages = endPage - startPage + 1;
      const allRepositories: GitHubRepository[] = [];
      let totalFound = 0;

      ProductionGitHubApiClient.logVerbose(config.verbose, 'Original gasTags:', config.gasTags);
      ProductionGitHubApiClient.logVerbose(
        config.verbose,
        'Valid tags:',
        validation.validTags.slice(0, 5)
      );
      ProductionGitHubApiClient.logVerbose(config.verbose, 'GitHub Search Query:', query);
      ProductionGitHubApiClient.logVerbose(config.verbose, 'Sort params:', sortParams);
      ProductionGitHubApiClient.logVerbose(
        config.verbose,
        `ページ範囲指定検索: ${startPage} - ${endPage} (${perPage}件/ページ, ${totalPages}ページ)`
      );

      for (let page = startPage; page <= endPage; page++) {
        const searchUrl = `${ProductionGitHubApiClient.GITHUB_API_BASE}/search/repositories?q=${encodeURIComponent(
          query
        )}&sort=${sortParams.value}&order=${sortParams.order}&per_page=${perPage}&page=${page}`;

        ProductionGitHubApiClient.logVerbose(
          config.verbose,
          `ページ ${page}/${endPage} を検索中: ${searchUrl}`
        );

        const headers = this.createHeaders();
        const response = await fetch(searchUrl, { headers });

        if (!response.ok) {
          const errorDetails = await ProductionGitHubApiClient.parseApiError(response);
          throw new Error(`GitHub Search API Error: ${errorDetails}`);
        }

        const searchResult: GitHubSearchResponse = await response.json();

        if (page === startPage) {
          totalFound = searchResult.total_count;
        }

        allRepositories.push(...searchResult.items);

        ProductionGitHubApiClient.logVerbose(
          config.verbose,
          `ページ ${page}: ${searchResult.items.length}件取得 (累計: ${allRepositories.length}件)`
        );

        if (searchResult.items.length === 0) {
          ProductionGitHubApiClient.logVerbose(
            config.verbose,
            `ページ ${page} で検索結果が0件のため処理を終了します`
          );
          break;
        }
      }

      return {
        success: true,
        repositories: allRepositories,
        totalFound,
        processedCount: allRepositories.length,
      };
    } catch (error) {
      console.error('GitHub Search エラー:', error);

      if (error instanceof Error && error.message.includes('422')) {
        ProductionGitHubApiClient.logVerbose(config.verbose, 'フォールバック検索を実行中...');
        return this.fallbackSearch(perPage * (endPage - startPage + 1), config.verbose);
      }

      return {
        success: false,
        repositories: [],
        totalFound: 0,
        processedCount: 0,
        error: ErrorUtils.getMessage(error, 'GitHub検索に失敗しました'),
      };
    }
  }

  /**
   * リポジトリの最終コミット日時を取得
   * @param owner リポジトリオーナー名
   * @param repo リポジトリ名
   * @returns 最終コミット日時（取得できない場合はnull）
   */
  async fetchLastCommitDate(owner: string, repo: string): Promise<Date | null> {
    const cacheKey = `commits:${owner}/${repo}`;

    // キャッシュから取得を試行（コミット日時は短時間キャッシュ）
    const cached = ProductionGitHubApiClient.getFromCache<string>(cacheKey);
    if (cached !== null) {
      return cached ? new Date(cached) : null;
    }

    try {
      const headers = this.createHeaders();
      const url = `${ProductionGitHubApiClient.GITHUB_API_BASE}/repos/${owner}/${repo}/commits?per_page=1`;

      const response = await ProductionGitHubApiClient.fetchWithRetry(url, { headers });

      if (!response.ok) {
        // エラーの場合は短時間キャッシュ
        ProductionGitHubApiClient.setCache(
          cacheKey,
          '',
          ProductionGitHubApiClient.RATE_LIMIT_CACHE_TTL
        );
        return null;
      }

      const latestCommits = await response.json();
      if (!latestCommits || latestCommits.length === 0) {
        ProductionGitHubApiClient.setCache(
          cacheKey,
          '',
          ProductionGitHubApiClient.RATE_LIMIT_CACHE_TTL
        );
        return null;
      }

      const lastCommitAt = new Date(latestCommits[0].commit.committer.date);

      // 成功時は短時間キャッシュ
      ProductionGitHubApiClient.setCache(
        cacheKey,
        lastCommitAt.toISOString(),
        ProductionGitHubApiClient.RATE_LIMIT_CACHE_TTL
      );

      return lastCommitAt;
    } catch (error) {
      console.error('コミット日時取得エラー:', error);
      ProductionGitHubApiClient.setCache(
        cacheKey,
        '',
        ProductionGitHubApiClient.RATE_LIMIT_CACHE_TTL
      );
      return null;
    }
  }

  /**
   * ファイル内容を取得
   * @param owner リポジトリオーナー名
   * @param repo リポジトリ名
   * @param path ファイルパス
   * @returns ファイル内容（取得できない場合はundefined）
   */
  async fetchFileContent(owner: string, repo: string, path: string): Promise<string | undefined> {
    const cacheKey = `content:${owner}/${repo}/${path}`;

    // キャッシュから取得を試行
    const cached = ProductionGitHubApiClient.getFromCache<string>(cacheKey);
    if (cached !== null) {
      return cached || undefined;
    }

    try {
      const headers = this.createHeaders();
      const url = `${ProductionGitHubApiClient.GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`;

      const response = await ProductionGitHubApiClient.fetchWithRetry(url, { headers });

      if (!response.ok) {
        // 404の場合もキャッシュして重複リクエストを防ぐ
        ProductionGitHubApiClient.setCache(
          cacheKey,
          '',
          ProductionGitHubApiClient.RATE_LIMIT_CACHE_TTL
        );
        return undefined;
      }

      const fileData: GitHubContentResponse = await response.json();

      // ディレクトリの場合はundefinedを返す
      if (fileData.type !== 'file') {
        ProductionGitHubApiClient.setCache(
          cacheKey,
          '',
          ProductionGitHubApiClient.RATE_LIMIT_CACHE_TTL
        );
        return undefined;
      }

      const content = ProductionGitHubApiClient.decodeBase64Content(
        fileData.content,
        fileData.encoding
      );

      // 成功時はキャッシュに保存
      ProductionGitHubApiClient.setCache(cacheKey, content);

      return content;
    } catch (error) {
      console.warn('ファイル取得に失敗:', error);
      // エラーの場合は短時間キャッシュして連続エラーを防ぐ
      ProductionGitHubApiClient.setCache(
        cacheKey,
        '',
        ProductionGitHubApiClient.RATE_LIMIT_CACHE_TTL
      );
      return undefined;
    }
  }

  /**
   * リポジトリのファイルツリーを取得
   * @param owner リポジトリオーナー名
   * @param repo リポジトリ名
   * @param sha ツリーSHA（デフォルトはHEAD）
   * @param recursive 再帰的に取得するか（デフォルトはtrue）
   * @returns ファイルツリー（取得できない場合はundefined）
   */
  async fetchRepositoryTree(
    owner: string,
    repo: string,
    sha: string = 'HEAD',
    recursive: boolean = true
  ): Promise<GitHubTreeResponse | undefined> {
    const cacheKey = `tree:${owner}/${repo}/${sha}/${recursive}`;

    // キャッシュから取得を試行
    const cached = ProductionGitHubApiClient.getFromCache<GitHubTreeResponse>(cacheKey);
    if (cached !== null) {
      return cached || undefined;
    }

    try {
      const headers = this.createHeaders();
      const url = `${ProductionGitHubApiClient.GITHUB_API_BASE}/repos/${owner}/${repo}/git/trees/${sha}${recursive ? '?recursive=1' : ''}`;

      const response = await ProductionGitHubApiClient.fetchWithRetry(url, { headers });

      if (!response.ok) {
        // 404の場合もキャッシュして重複リクエストを防ぐ
        ProductionGitHubApiClient.setCache(
          cacheKey,
          null,
          ProductionGitHubApiClient.RATE_LIMIT_CACHE_TTL
        );
        return undefined;
      }

      const treeData: GitHubTreeResponse = await response.json();

      // 成功時はキャッシュに保存
      ProductionGitHubApiClient.setCache(cacheKey, treeData);

      return treeData;
    } catch (error) {
      console.warn('ツリー取得に失敗:', error);
      // エラーの場合は短時間キャッシュして連続エラーを防ぐ
      ProductionGitHubApiClient.setCache(
        cacheKey,
        null,
        ProductionGitHubApiClient.RATE_LIMIT_CACHE_TTL
      );
      return undefined;
    }
  }

  /**
   * Base64エンコードされたコンテンツをデコード
   * @private
   */
  private static decodeBase64Content(content: string, encoding: string): string {
    if (encoding === 'base64') {
      return atob(content.replace(/\n/g, ''));
    }
    return content;
  }

  /**
   * APIエラーレスポンスを解析して詳細なエラーメッセージを生成
   * @private
   */
  private static async parseApiError(response: Response): Promise<string> {
    let errorDetails = `${response.status} ${response.statusText}`;
    try {
      const errorBody = await response.text();
      if (errorBody) {
        const errorData = JSON.parse(errorBody);
        if (errorData.message) {
          errorDetails += `: ${errorData.message}`;
        }
        if (errorData.errors) {
          errorDetails += ` - ${JSON.stringify(errorData.errors)}`;
        }
      }
    } catch {
      // JSONパースエラーは無視
    }
    return errorDetails;
  }

  /**
   * タグを検証し、検索クエリを構築
   * @private
   */
  private static validateAndBuildQuery(config: ScraperConfig): TagValidationResult {
    const tagsToUse =
      config.gasTags && config.gasTags.length > 0
        ? config.gasTags
        : ['google-apps-script', 'apps-script'];

    const validTags = tagsToUse.filter(tag => tag && tag.trim().length > 0);

    if (validTags.length === 0) {
      return {
        isValid: false,
        validTags: [],
        errorResult: {
          success: false,
          repositories: [],
          totalFound: 0,
          processedCount: 0,
          error: '有効なGASタグが指定されていません',
        },
      };
    }

    return { isValid: true, validTags };
  }

  /**
   * タグリストから検索クエリを構築
   * @private
   */
  private static buildSearchQuery(validTags: string[], maxTags: number = 5): string {
    const limitedTags = validTags.slice(0, maxTags);
    if (limitedTags.length === 1) {
      return `${limitedTags[0].trim()} in:topics`;
    }
    const tagTerms = limitedTags.map(tag => tag.trim()).join(' OR ');
    return `${tagTerms} in:topics`;
  }

  /**
   * 詳細ログ出力（verbose有効時のみ）
   * @private
   */
  private static logVerbose(verbose: boolean | undefined, ...messages: unknown[]): void {
    if (verbose) {
      console.log(...messages);
    }
  }

  /**
   * フォールバック検索（最もシンプルなクエリを使用）
   * @param maxResults 最大取得件数
   * @param verbose 詳細ログを出力するか
   * @returns 検索結果
   */
  private async fallbackSearch(
    maxResults: number,
    verbose: boolean = false
  ): Promise<TagSearchResult> {
    try {
      const query = 'google-apps-script in:topics';
      const searchUrl = `${ProductionGitHubApiClient.GITHUB_API_BASE}/search/repositories?q=${encodeURIComponent(
        query
      )}&sort=stars&order=desc&per_page=${Math.min(maxResults, 50)}`;

      if (verbose) {
        console.log('Fallback Search Query:', query);
      }

      const headers = this.createHeaders();
      const response = await fetch(searchUrl, { headers });
      if (!response.ok) {
        throw new Error(`Fallback Search API Error: ${response.status} ${response.statusText}`);
      }

      const searchResult: GitHubSearchResponse = await response.json();

      return {
        success: true,
        repositories: searchResult.items,
        totalFound: searchResult.total_count,
        processedCount: searchResult.items.length,
      };
    } catch (error) {
      console.error('フォールバック検索エラー:', error);
      return {
        success: false,
        repositories: [],
        totalFound: 0,
        processedCount: 0,
        error: ErrorUtils.getMessage(error, 'フォールバック検索に失敗しました'),
      };
    }
  }
}
