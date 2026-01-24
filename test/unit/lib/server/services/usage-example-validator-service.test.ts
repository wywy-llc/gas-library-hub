/**
 * usageExampleバリデーションサービスのユニットテスト
 */

import { describe, expect, it } from 'vitest';
import { UsageExampleValidatorService } from '$lib/server/services/usage-example-validator-service.js';
import type { UsageExampleAnnotated } from '$lib/types/library-summary.js';
import { PublicApiTestDataFactories } from '../../../../factories/index.js';

describe('UsageExampleValidatorService', () => {
  describe('extractMethodCalls', () => {
    it('メソッドチェーン呼び出しを抽出する', () => {
      const code = `
const service = createService();
service.setClientId('id');
service.setClientSecret('secret');
`;

      const calls = UsageExampleValidatorService.extractMethodCalls(code);

      expect(calls).toContain('service.setClientId');
      expect(calls).toContain('service.setClientSecret');
    });

    it('単独関数呼び出しを抽出する', () => {
      const code = `
createService();
initializeApp();
`;

      const calls = UsageExampleValidatorService.extractMethodCalls(code);

      expect(calls).toContain('createService');
      expect(calls).toContain('initializeApp');
    });

    it('new ClassName パターンを抽出する', () => {
      const code = `
const oauth = new OAuth2Service();
const config = new ConfigBuilder();
`;

      const calls = UsageExampleValidatorService.extractMethodCalls(code);

      expect(calls).toContain('new OAuth2Service');
      expect(calls).toContain('new ConfigBuilder');
    });

    it('コードブロック内のコードを抽出する', () => {
      const code = `
使用例:

\`\`\`javascript
const service = createService();
service.init();
\`\`\`
`;

      const calls = UsageExampleValidatorService.extractMethodCalls(code);

      expect(calls).toContain('createService');
      expect(calls).toContain('service.init');
    });

    it('組み込みオブジェクトのメソッドを除外する', () => {
      const code = `
console.log('Hello');
JSON.parse('{}');
Array.from([1, 2, 3]);
SpreadsheetApp.getActiveSheet();
`;

      const calls = UsageExampleValidatorService.extractMethodCalls(code);

      expect(calls).not.toContain('console.log');
      expect(calls).not.toContain('JSON.parse');
      expect(calls).not.toContain('Array.from');
      expect(calls).not.toContain('SpreadsheetApp.getActiveSheet');
    });

    it('組み込み関数を除外する', () => {
      const code = `
parseInt('123');
parseFloat('1.5');
setTimeout(() => {}, 1000);
`;

      const calls = UsageExampleValidatorService.extractMethodCalls(code);

      expect(calls).not.toContain('parseInt');
      expect(calls).not.toContain('parseFloat');
      expect(calls).not.toContain('setTimeout');
    });

    it('制御構文を除外する', () => {
      const code = `
if (condition) {}
for (let i = 0; i < 10; i++) {}
while (running) {}
`;

      const calls = UsageExampleValidatorService.extractMethodCalls(code);

      expect(calls).not.toContain('if');
      expect(calls).not.toContain('for');
      expect(calls).not.toContain('while');
    });

    it('コメントを無視する', () => {
      const code = `
// unknownMethod() をコメント
/*
  anotherMethod() も無視
*/
createService(); // 実際のコード
`;

      const calls = UsageExampleValidatorService.extractMethodCalls(code);

      expect(calls).not.toContain('unknownMethod');
      expect(calls).not.toContain('anotherMethod');
      expect(calls).toContain('createService');
    });

    it('組み込みクラスのnewを除外する', () => {
      const code = `
const date = new Date();
const map = new Map();
const promise = new Promise(() => {});
`;

      const calls = UsageExampleValidatorService.extractMethodCalls(code);

      expect(calls).not.toContain('new Date');
      expect(calls).not.toContain('new Map');
      expect(calls).not.toContain('new Promise');
    });
  });

  describe('validate', () => {
    const publicApis = PublicApiTestDataFactories.oauth2Example();

    /**
     * ヘルパー: 新形式のUsageExampleAnnotatedを作成
     */
    const createUsageExample = (code: string): UsageExampleAnnotated => ({
      functions: [{ name: 'createService', summary: { ja: 'サービス生成', en: 'Create service' } }],
      examples: [
        {
          title: { ja: 'テスト例', en: 'Test Example' },
          code,
          explanation: { ja: 'テスト', en: 'Test' },
        },
      ],
    });

    it('有効なusageExampleの場合はisValid=trueを返す', () => {
      const usageExample: UsageExampleAnnotated = {
        functions: [
          { name: 'createService', summary: { ja: 'サービス生成', en: 'Create service' } },
          {
            name: 'OAuth2Service',
            summary: { ja: 'OAuth2サービスクラス', en: 'OAuth2 service class' },
          },
        ],
        examples: [
          {
            title: { ja: 'OAuth2認証', en: 'OAuth2 Auth' },
            code: `const service = createService();
service.setTokenUrl('https://example.com/token');
service.setClientId('client_id');
const authUrl = service.getAuthUrl();`,
            explanation: { ja: '認証の例', en: 'Auth example' },
          },
        ],
      };

      const result = UsageExampleValidatorService.validate(usageExample, publicApis);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('存在しない関数をfunctionsに含む場合はエラーを返す', () => {
      const usageExample: UsageExampleAnnotated = {
        functions: [{ name: 'unknownFunction', summary: { ja: '不明', en: 'Unknown' } }],
        examples: [],
      };

      const result = UsageExampleValidatorService.validate(usageExample, publicApis);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.type === 'unknown_function')).toBe(true);
      expect(result.errors.some(e => e.invalidCall === 'unknownFunction')).toBe(true);
    });

    it('存在しないメソッドをexamples[].codeで使用した場合はエラーを返す', () => {
      const usageExample = createUsageExample(`const service = createService();
service.nonExistentMethod();`);

      const result = UsageExampleValidatorService.validate(usageExample, publicApis);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.type === 'unknown_method')).toBe(true);
    });

    it('存在しないクラスをnewした場合はエラーを返す', () => {
      const usageExample = createUsageExample('const service = new NonExistentClass();');

      const result = UsageExampleValidatorService.validate(usageExample, publicApis);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.type === 'unknown_class')).toBe(true);
    });

    it('抽出したメソッド呼び出しを返す', () => {
      const usageExample = createUsageExample(`const service = createService();
service.setClientId('id');`);

      const result = UsageExampleValidatorService.validate(usageExample, publicApis);

      expect(result.extractedCalls.ja).toContain('createService');
      expect(result.extractedCalls.ja).toContain('service.setClientId');
    });

    it('類似名を提案する', () => {
      const usageExample: UsageExampleAnnotated = {
        functions: [
          { name: 'createServic', summary: { ja: 'typo', en: 'typo' } }, // typo
        ],
        examples: [],
      };

      const result = UsageExampleValidatorService.validate(usageExample, publicApis);

      expect(result.isValid).toBe(false);
      const error = result.errors.find(e => e.invalidCall === 'createServic');
      expect(error?.suggestions).toContain('createService');
    });
  });

  describe('levenshteinDistance', () => {
    it('同じ文字列の距離は0', () => {
      const distance = UsageExampleValidatorService.levenshteinDistance('hello', 'hello');
      expect(distance).toBe(0);
    });

    it('1文字の置換は距離1', () => {
      const distance = UsageExampleValidatorService.levenshteinDistance('hello', 'hallo');
      expect(distance).toBe(1);
    });

    it('1文字の挿入は距離1', () => {
      const distance = UsageExampleValidatorService.levenshteinDistance('hello', 'helloo');
      expect(distance).toBe(1);
    });

    it('1文字の削除は距離1', () => {
      const distance = UsageExampleValidatorService.levenshteinDistance('hello', 'hell');
      expect(distance).toBe(1);
    });

    it('複数の編集操作の距離を計算する', () => {
      const distance = UsageExampleValidatorService.levenshteinDistance('kitten', 'sitting');
      expect(distance).toBe(3); // k->s, e->i, +g
    });

    it('空文字列との距離は文字列の長さ', () => {
      const distance = UsageExampleValidatorService.levenshteinDistance('hello', '');
      expect(distance).toBe(5);
    });
  });

  describe('findSimilarNames', () => {
    it('類似名を距離順にソートして返す', () => {
      const candidates = ['createService', 'createSession', 'deleteService', 'initService'];
      const similar = UsageExampleValidatorService.findSimilarNames('createServic', candidates);

      expect(similar[0]).toBe('createService'); // 距離1
    });

    it('距離が3以下の候補のみ返す', () => {
      const candidates = ['createService', 'completelyDifferentName'];
      const similar = UsageExampleValidatorService.findSimilarNames('createServic', candidates);

      expect(similar).toContain('createService');
      expect(similar).not.toContain('completelyDifferentName');
    });

    it('最大3件まで返す', () => {
      const candidates = ['a1', 'a2', 'a3', 'a4', 'a5'];
      const similar = UsageExampleValidatorService.findSimilarNames('a0', candidates);

      expect(similar.length).toBeLessThanOrEqual(3);
    });

    it('候補がない場合は空配列を返す', () => {
      const candidates = ['completelyDifferent', 'anotherOne'];
      const similar = UsageExampleValidatorService.findSimilarNames('xyz', candidates);

      expect(similar).toEqual([]);
    });
  });
});
