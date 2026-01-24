/**
 * GASスクリプトID検証ユーティリティ
 * Google Drive URLを使用してスクリプトIDの存在・アクセス可能性を検証する
 */

/**
 * スクリプト検証ステータス
 * - accessible: 存在しアクセス可能
 * - inaccessible: 存在するがアクセス権限なし（非公開）
 * - not_found: 存在しない（削除済み or 無効なID）
 * - unknown: 検証未実施または検証エラー
 */
export type ScriptValidationStatus = 'accessible' | 'inaccessible' | 'not_found' | 'unknown';

export interface ScriptValidationResult {
  scriptId: string;
  status: ScriptValidationStatus;
  httpStatus: number;
}

const VALIDATION_TIMEOUT_MS = 5000;

export const GasScriptValidator = (() => {
  /**
   * HTTPステータスコードから検証ステータスにマッピング
   */
  const mapHttpStatus = (httpStatus: number): ScriptValidationStatus => {
    if (httpStatus === 200) return 'accessible';
    if (httpStatus === 401 || httpStatus === 403) return 'inaccessible';
    if (httpStatus === 404) return 'not_found';
    return 'unknown';
  };

  /**
   * 単一のスクリプトIDを検証
   * Google Drive URLにHEADリクエストを送信して存在確認を行う
   */
  const validate = async (scriptId: string): Promise<ScriptValidationResult> => {
    const url = `https://drive.google.com/file/d/${scriptId}/view`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), VALIDATION_TIMEOUT_MS);

      const response = await fetch(url, {
        method: 'HEAD',
        redirect: 'manual', // リダイレクトを追跡しない
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const status = mapHttpStatus(response.status);
      return { scriptId, status, httpStatus: response.status };
    } catch (error) {
      // タイムアウトまたはネットワークエラー
      console.warn(`[GasScriptValidator] Validation failed for ${scriptId}:`, error);
      return { scriptId, status: 'unknown', httpStatus: 0 };
    }
  };

  /**
   * 複数のスクリプトIDを並列で検証
   */
  const validateMultiple = async (scriptIds: string[]): Promise<ScriptValidationResult[]> => {
    return Promise.all(scriptIds.map(id => validate(id)));
  };

  /**
   * 検証ステータスが問題ありかどうかを判定
   */
  const hasIssue = (status: ScriptValidationStatus): boolean => {
    return status === 'inaccessible' || status === 'not_found';
  };

  return {
    validate,
    validateMultiple,
    hasIssue,
    mapHttpStatus,
  } as const;
})();
