import type { DocumentType } from '$lib/server/db/schema.js';

/**
 * Google ドキュメントURL変換エラー
 */
export class GoogleDocUrlTransformError extends Error {
  constructor(
    message: string,
    public readonly code: 'INVALID_URL' | 'UNSUPPORTED_TYPE' | 'PARSE_ERROR'
  ) {
    super(message);
    this.name = 'GoogleDocUrlTransformError';
  }
}

/**
 * URL変換結果
 */
export interface UrlTransformResult {
  documentType: DocumentType;
  documentId: string;
  originalUrl: string;
  copyUrl: string;
}

/**
 * GoogleドキュメントURLを「コピーを作成」リンクに変換するサービス
 *
 * 対応フォーマット:
 * - スプレッドシート: /d/{ID}/edit → /d/{ID}/copy
 * - ドキュメント: /d/{ID}/edit → /d/{ID}/copy
 * - スライド: /d/{ID}/edit → /d/{ID}/copy
 * - GAS: /d/{ID}/edit → /d/{ID}/edit?copyDoc=true
 */
export const GoogleDocUrlTransformService = (() => {
  // ドキュメントタイプ検出用パターン
  const PATTERNS = {
    spreadsheet: /docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/,
    document: /docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/,
    slides: /docs\.google\.com\/presentation\/d\/([a-zA-Z0-9_-]+)/,
    apps_script: /script\.google\.com\/(?:home\/projects\/|d\/)([a-zA-Z0-9_-]+)/,
  } as const;

  /**
   * URLからドキュメントタイプとIDを抽出
   */
  const parseUrl = (url: string): { type: DocumentType; id: string } | null => {
    for (const [type, pattern] of Object.entries(PATTERNS)) {
      const match = url.match(pattern);
      if (match) {
        return { type: type as DocumentType, id: match[1] };
      }
    }
    return null;
  };

  /**
   * コピーURLを生成
   */
  const generateCopyUrl = (type: DocumentType, id: string): string => {
    switch (type) {
      case 'spreadsheet':
        return `https://docs.google.com/spreadsheets/d/${id}/copy`;
      case 'document':
        return `https://docs.google.com/document/d/${id}/copy`;
      case 'slides':
        return `https://docs.google.com/presentation/d/${id}/copy`;
      case 'apps_script':
        return `https://script.google.com/d/${id}/edit?copyDoc=true`;
    }
  };

  /**
   * 正規化されたオリジナルURLを生成
   */
  const normalizeOriginalUrl = (type: DocumentType, id: string): string => {
    switch (type) {
      case 'spreadsheet':
        return `https://docs.google.com/spreadsheets/d/${id}/edit`;
      case 'document':
        return `https://docs.google.com/document/d/${id}/edit`;
      case 'slides':
        return `https://docs.google.com/presentation/d/${id}/edit`;
      case 'apps_script':
        return `https://script.google.com/d/${id}/edit`;
    }
  };

  return {
    /**
     * GoogleドキュメントURLを「コピーを作成」リンクに変換
     *
     * @param url 変換対象のGoogleドキュメントURL
     * @returns 変換結果（ドキュメントタイプ、ID、オリジナルURL、コピーURL）
     * @throws GoogleDocUrlTransformError 無効なURLまたはサポートされていない形式の場合
     *
     * @example
     * ```typescript
     * const result = GoogleDocUrlTransformService.transform(
     *   'https://docs.google.com/spreadsheets/d/abc123/edit#gid=0'
     * );
     * // result.copyUrl === 'https://docs.google.com/spreadsheets/d/abc123/copy'
     * ```
     */
    transform: (url: string): UrlTransformResult => {
      if (!url || typeof url !== 'string') {
        throw new GoogleDocUrlTransformError('URLが指定されていません', 'INVALID_URL');
      }

      const trimmedUrl = url.trim();

      // URL形式の基本チェック
      if (!trimmedUrl.includes('docs.google.com') && !trimmedUrl.includes('script.google.com')) {
        throw new GoogleDocUrlTransformError(
          'GoogleドキュメントのURLを入力してください',
          'INVALID_URL'
        );
      }

      const parsed = parseUrl(trimmedUrl);

      if (!parsed) {
        throw new GoogleDocUrlTransformError(
          'サポートされていないGoogleドキュメント形式です。スプレッドシート、ドキュメント、スライド、またはApps ScriptのURLを入力してください',
          'UNSUPPORTED_TYPE'
        );
      }

      return {
        documentType: parsed.type,
        documentId: parsed.id,
        originalUrl: normalizeOriginalUrl(parsed.type, parsed.id),
        copyUrl: generateCopyUrl(parsed.type, parsed.id),
      };
    },

    /**
     * URLがサポートされているGoogleドキュメント形式かチェック
     *
     * @param url チェック対象のURL
     * @returns サポートされている場合はtrue
     */
    isSupported: (url: string): boolean => {
      if (!url || typeof url !== 'string') {
        return false;
      }
      return parseUrl(url.trim()) !== null;
    },

    /**
     * URLからドキュメントタイプを取得
     *
     * @param url 対象のURL
     * @returns ドキュメントタイプ、またはサポートされていない場合はnull
     */
    getDocumentType: (url: string): DocumentType | null => {
      if (!url || typeof url !== 'string') {
        return null;
      }
      const parsed = parseUrl(url.trim());
      return parsed?.type ?? null;
    },
  } as const;
})();
