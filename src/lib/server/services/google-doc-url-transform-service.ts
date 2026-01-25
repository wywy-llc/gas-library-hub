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
 * ドキュメントタイプ別のURL設定
 */
interface DocTypeConfig {
  pattern: RegExp;
  baseUrl: string;
  copyPath: string;
}

/**
 * ドキュメントタイプ別URL設定マッピング
 * - pattern: URL検出用正規表現（IDをキャプチャ）
 * - baseUrl: ベースURL（IDを挿入して使用）
 * - copyPath: コピーURL用パス（/copy または /edit?copyDoc=true）
 */
const DOC_TYPE_CONFIG: Record<DocumentType, DocTypeConfig> = {
  spreadsheet: {
    pattern: /docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/,
    baseUrl: 'https://docs.google.com/spreadsheets/d',
    copyPath: '/copy',
  },
  document: {
    pattern: /docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/,
    baseUrl: 'https://docs.google.com/document/d',
    copyPath: '/copy',
  },
  slides: {
    pattern: /docs\.google\.com\/presentation\/d\/([a-zA-Z0-9_-]+)/,
    baseUrl: 'https://docs.google.com/presentation/d',
    copyPath: '/copy',
  },
  apps_script: {
    pattern: /script\.google\.com\/(?:home\/projects\/|d\/)([a-zA-Z0-9_-]+)/,
    baseUrl: 'https://script.google.com/d',
    copyPath: '/edit?copyDoc=true',
  },
} as const;

/** 許可されたGoogleドキュメントホスト */
const ALLOWED_HOSTS = new Set(['docs.google.com', 'script.google.com']);

/** DOC_TYPE_CONFIGエントリのキャッシュ（parseUrl最適化用） */
const DOC_TYPE_ENTRIES = Object.entries(DOC_TYPE_CONFIG) as [DocumentType, DocTypeConfig][];

/**
 * 非サポートのGoogleサービス検出用パターン
 * - 検出時により具体的なエラーメッセージを表示するため
 */
const UNSUPPORTED_SERVICES: { pattern: RegExp; name: string }[] = [
  { pattern: /docs\.google\.com\/forms\//, name: 'Googleフォーム' },
  { pattern: /docs\.google\.com\/drawings\//, name: 'Google図形描画' },
  { pattern: /drive\.google\.com\//, name: 'Googleドライブ' },
];

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
  /**
   * URLからドキュメントタイプとIDを抽出
   */
  const parseUrl = (url: string): { type: DocumentType; id: string } | null => {
    for (const [type, config] of DOC_TYPE_ENTRIES) {
      const match = url.match(config.pattern);
      if (match) {
        return { type, id: match[1] };
      }
    }
    return null;
  };

  /**
   * コピーURLを生成
   */
  const generateCopyUrl = (type: DocumentType, id: string): string => {
    const config = DOC_TYPE_CONFIG[type];
    return `${config.baseUrl}/${id}${config.copyPath}`;
  };

  /**
   * 正規化されたオリジナルURLを生成
   */
  const normalizeOriginalUrl = (type: DocumentType, id: string): string => {
    const config = DOC_TYPE_CONFIG[type];
    return `${config.baseUrl}/${id}/edit`;
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

      // URL形式の基本チェック（ホスト名で検証）
      let hostname: string;
      try {
        const urlObj = new URL(trimmedUrl);
        hostname = urlObj.hostname;
      } catch {
        throw new GoogleDocUrlTransformError(
          'GoogleドキュメントのURLを入力してください',
          'INVALID_URL'
        );
      }

      if (!ALLOWED_HOSTS.has(hostname)) {
        throw new GoogleDocUrlTransformError(
          'GoogleドキュメントのURLを入力してください',
          'INVALID_URL'
        );
      }

      const parsed = parseUrl(trimmedUrl);

      if (!parsed) {
        // 非サポートのGoogleサービスを特定してより具体的なエラーメッセージを提供
        const unsupportedService = UNSUPPORTED_SERVICES.find(s => s.pattern.test(trimmedUrl));
        if (unsupportedService) {
          throw new GoogleDocUrlTransformError(
            `${unsupportedService.name}はサポートされていません。スプレッドシート、ドキュメント、スライド、またはApps ScriptのURLを入力してください`,
            'UNSUPPORTED_TYPE'
          );
        }
        throw new GoogleDocUrlTransformError(
          'サポートされていないURL形式です。スプレッドシート、ドキュメント、スライド、またはApps Scriptの編集URLを入力してください',
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
