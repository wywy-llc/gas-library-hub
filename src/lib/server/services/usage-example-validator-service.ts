/**
 * usageExampleバリデーションサービス
 *
 * 生成されたコード例が実際のAPIと一致するか検証する。
 * ハルシネーション（存在しないメソッドの創作）を検出する。
 */

import type { PublicApi, ValidationError, ValidationResult } from '$lib/types/source-analysis.js';

/**
 * 組み込み関数・クラス（検証から除外）
 */
const BUILTIN_IDENTIFIERS = new Set([
  // JavaScript組み込み
  'console',
  'JSON',
  'Object',
  'Array',
  'Date',
  'Math',
  'String',
  'Number',
  'Boolean',
  'Promise',
  'Error',
  'RegExp',
  'Map',
  'Set',
  'WeakMap',
  'WeakSet',
  'Symbol',
  'Proxy',
  'Reflect',
  'parseInt',
  'parseFloat',
  'isNaN',
  'isFinite',
  'encodeURIComponent',
  'decodeURIComponent',
  'setTimeout',
  'setInterval',
  'clearTimeout',
  'clearInterval',
  'fetch',
  'atob',
  'btoa',

  // GAS組み込み
  'Logger',
  'SpreadsheetApp',
  'DriveApp',
  'GmailApp',
  'CalendarApp',
  'DocumentApp',
  'SlidesApp',
  'FormApp',
  'ScriptApp',
  'UrlFetchApp',
  'PropertiesService',
  'CacheService',
  'LockService',
  'Session',
  'Utilities',
  'ContentService',
  'HtmlService',
  'Browser',
  'CardService',
  'Charts',
]);

export const UsageExampleValidatorService = (() => {
  /**
   * コード文字列からメソッド呼び出しを抽出
   * @param code コード文字列
   * @returns 抽出されたメソッド呼び出し
   */
  const extractMethodCalls = (code: string): string[] => {
    const calls: Set<string> = new Set();

    // コードブロック内のコードのみを抽出
    const codeBlockPattern = /```(?:javascript|js)?\s*([\s\S]*?)```/g;
    let codeContent = '';
    let match;

    while ((match = codeBlockPattern.exec(code)) !== null) {
      codeContent += match[1] + '\n';
    }

    // コードブロックがない場合は全体を使用
    if (!codeContent) {
      codeContent = code;
    }

    // コメントを除去
    codeContent = codeContent
      .replace(/\/\/.*$/gm, '') // 行コメント
      .replace(/\/\*[\s\S]*?\*\//g, ''); // ブロックコメント

    // メソッドチェーン呼び出しパターン: identifier.method(
    const methodCallPattern = /(\w+)\.(\w+)\s*\(/g;
    while ((match = methodCallPattern.exec(codeContent)) !== null) {
      const [, obj, method] = match;
      // 組み込みオブジェクトのメソッドは除外
      if (!BUILTIN_IDENTIFIERS.has(obj)) {
        calls.add(`${obj}.${method}`);
      }
    }

    // 単独関数呼び出しパターン: functionName(
    // ただし new ClassName() は除外
    const functionCallPattern = /(?<!new\s+)(?<!\w\.)(?<!function\s+)\b([A-Z]\w*|[a-z]\w*)\s*\(/g;
    while ((match = functionCallPattern.exec(codeContent)) !== null) {
      const funcName = match[1];
      // 組み込み関数と制御構文を除外
      if (
        !BUILTIN_IDENTIFIERS.has(funcName) &&
        !['if', 'for', 'while', 'switch', 'catch', 'function', 'return'].includes(funcName)
      ) {
        calls.add(funcName);
      }
    }

    // new ClassName() パターン
    const newPattern = /new\s+(\w+)\s*\(/g;
    while ((match = newPattern.exec(codeContent)) !== null) {
      const className = match[1];
      if (!BUILTIN_IDENTIFIERS.has(className)) {
        calls.add(`new ${className}`);
      }
    }

    return Array.from(calls);
  };

  /**
   * usageExampleを検証
   * @param usageExample usageExample（日本語・英語）
   * @param publicApis 公開API一覧
   * @returns バリデーション結果
   */
  const validate = (
    usageExample: { ja: string; en: string },
    publicApis: PublicApi[]
  ): ValidationResult => {
    // 公開APIから名前セットを作成
    const apiNames = new Set(publicApis.map(api => api.name));
    const classNames = new Set(publicApis.filter(api => api.type === 'class').map(api => api.name));
    const functionNames = new Set(
      publicApis.filter(api => api.type === 'function').map(api => api.name)
    );
    const methodNames = new Set(
      publicApis.filter(api => api.type === 'method').map(api => api.name)
    );

    const errors: ValidationError[] = [];
    const extractedCalls: { ja: string[]; en: string[] } = { ja: [], en: [] };

    // 日本語・英語両方を検証
    for (const [lang, code] of [
      ['ja', usageExample.ja],
      ['en', usageExample.en],
    ] as const) {
      const calls = extractMethodCalls(code);
      extractedCalls[lang] = calls;

      for (const call of calls) {
        // new ClassName の場合
        if (call.startsWith('new ')) {
          const className = call.replace('new ', '');
          if (!classNames.has(className)) {
            errors.push({
              language: lang,
              invalidCall: call,
              type: 'unknown_class',
              message: `クラス "${className}" は公開APIに存在しません`,
              suggestions: findSimilarNames(className, Array.from(classNames)),
            });
          }
          continue;
        }

        // メソッド呼び出しの場合（object.method）
        if (call.includes('.')) {
          const [, methodPart] = call.split('.');

          // 完全一致するメソッドがあるかチェック
          const hasExactMatch = Array.from(methodNames).some(m => m.endsWith(`.${methodPart}`));

          if (!hasExactMatch && !apiNames.has(call)) {
            const similarMethods = Array.from(methodNames)
              .filter(m => {
                const mMethod = m.split('.').pop() || '';
                return levenshteinDistance(methodPart.toLowerCase(), mMethod.toLowerCase()) <= 3;
              })
              .slice(0, 3);

            errors.push({
              language: lang,
              invalidCall: call,
              type: 'unknown_method',
              message: `メソッド "${methodPart}" は公開APIに存在しません`,
              suggestions: similarMethods,
            });
          }
          continue;
        }

        // 関数呼び出しの場合
        if (!functionNames.has(call) && !classNames.has(call) && !apiNames.has(call)) {
          errors.push({
            language: lang,
            invalidCall: call,
            type: 'unknown_function',
            message: `関数 "${call}" は公開APIに存在しません`,
            suggestions: findSimilarNames(call, Array.from(functionNames)),
          });
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      extractedCalls,
    };
  };

  /**
   * レーベンシュタイン距離を計算
   * @param a 文字列A
   * @param b 文字列B
   * @returns 距離
   */
  const levenshteinDistance = (a: string, b: string): number => {
    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1 // deletion
          );
        }
      }
    }

    return matrix[b.length][a.length];
  };

  /**
   * 類似名を検索
   * @param target 検索対象
   * @param candidates 候補
   * @returns 類似名リスト
   */
  const findSimilarNames = (target: string, candidates: string[]): string[] => {
    return candidates
      .map(c => ({ name: c, distance: levenshteinDistance(target.toLowerCase(), c.toLowerCase()) }))
      .filter(c => c.distance <= 3)
      .sort((a, b) => a.distance - b.distance)
      .map(c => c.name)
      .slice(0, 3);
  };

  return {
    extractMethodCalls,
    validate,
    // テスト用にエクスポート
    levenshteinDistance,
    findSimilarNames,
  } as const;
})();
