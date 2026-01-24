/**
 * ソースコード分析用の型定義
 */

/**
 * ソースファイル情報
 */
export interface SourceFile {
  path: string;
  content: string;
}

/**
 * 公開API情報
 */
export interface PublicApi {
  type: 'function' | 'class' | 'method' | 'variable';
  name: string;
  file: string;
  signature?: string;
}

/**
 * リポジトリ分析結果
 */
export interface RepositoryAnalysis {
  success: boolean;
  error?: string;
  entryPoints?: string[];
  publicApis?: PublicApi[];
  sourceFiles?: SourceFile[];
}

/**
 * バリデーションエラー
 */
export interface ValidationError {
  language: 'ja' | 'en';
  invalidCall: string;
  type: 'unknown_class' | 'unknown_method' | 'unknown_function';
  message: string;
  suggestions?: string[];
}

/**
 * バリデーション結果
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  extractedCalls: {
    ja: string[];
    en: string[];
  };
}
