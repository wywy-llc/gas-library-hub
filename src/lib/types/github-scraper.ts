/**
 * GitHub API レスポンス型定義
 * GAS Library Scraper用の型定義
 */

import type { ScriptValidationStatus } from '$lib/server/utils/gas-script-validator';

export interface ScraperConfig {
  rateLimit: {
    maxRequestsPerHour: number;
  };
  scriptIdPatterns: RegExp[];
  webAppPatterns: RegExp[];
  gasTags: string[];
  verbose: boolean;
}

export interface GitHubSearchResponse {
  total_count: number;
  incomplete_results: boolean;
  items: GitHubRepository[];
}

export interface GitHubRepository {
  name: string;
  description: string | null;
  html_url: string;
  clone_url: string;
  stargazers_count: number;
  owner: {
    login: string;
    html_url: string;
  };
  license: {
    name: string;
    url: string;
  } | null;
  created_at: string;
  updated_at: string;
}

export interface GitHubReadmeResponse {
  content: string;
  encoding: string;
}

/**
 * GitHub Contents API レスポンス型
 * /repos/{owner}/{repo}/contents/{path} エンドポイント
 */
export interface GitHubContentResponse {
  content: string;
  encoding: 'base64' | 'utf-8';
  sha: string;
  size: number;
  name: string;
  path: string;
  type: 'file' | 'dir' | 'symlink' | 'submodule';
  url: string;
  html_url: string;
  download_url: string | null;
}

/**
 * GitHub Tree API のファイル/ディレクトリ情報
 */
export interface GitHubTreeItem {
  path: string;
  mode: string;
  type: 'blob' | 'tree';
  sha: string;
  size?: number;
  url: string;
}

/**
 * GitHub Tree API レスポンス型
 * /repos/{owner}/{repo}/git/trees/{sha} エンドポイント
 */
export interface GitHubTreeResponse {
  sha: string;
  url: string;
  tree: GitHubTreeItem[];
  truncated: boolean;
}

export interface ScrapedLibraryData {
  name: string;
  scriptId: string;
  repositoryUrl: string;
  authorUrl: string;
  authorName: string;
  description: string;
  licenseType?: string;
  licenseUrl?: string;
  starCount?: number;
  lastCommitAt: Date;
  status: 'pending';
  scriptType: 'library' | 'web_app';
  /** スクリプトIDの検証ステータス */
  scriptValidationStatus?: ScriptValidationStatus;
}

export interface ScrapeResult {
  success: boolean;
  data?: ScrapedLibraryData;
  error?: string;
}

export interface BulkScrapeResult {
  success: boolean;
  results: ScrapeResult[];
  total: number;
  successCount: number;
  errorCount: number;
  duplicateCount: number;
}

export interface TagSearchResult {
  success: boolean;
  repositories: GitHubRepository[];
  totalFound: number;
  processedCount: number;
  error?: string;
}
