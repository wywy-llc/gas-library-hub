import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { GenerateLibrarySummaryService } from '../../../../../src/lib/server/services/generate-library-summary-service.js';
import type {
  LibrarySummary,
  LibrarySummaryParams,
} from '../../../../../src/lib/types/library-summary.js';

// OpenAI SDK全体をモック（xAI APIはOpenAI SDK互換）
vi.mock('openai', () => ({
  default: vi.fn(),
}));

// XaiUtilsをモック
vi.mock('../../../../../src/lib/server/utils/xai-utils.js', () => ({
  XaiUtils: {
    getClient: vi.fn(),
  },
}));

import type OpenAI from 'openai';
import { XaiUtils } from '../../../../../src/lib/server/utils/xai-utils.js';

const mockedXaiUtils = vi.mocked(XaiUtils, true);

describe('GenerateLibrarySummaryService', () => {
  const mockParams: LibrarySummaryParams = {
    githubUrl: 'https://github.com/test/sample-gas-library',
  };

  const mockLibrarySummary: LibrarySummary = {
    basicInfo: {
      libraryName: {
        ja: 'サンプルGASライブラリ',
        en: 'Sample GAS Library',
      },
      purpose: {
        ja: 'Google Apps ScriptでのAPI連携を簡素化',
        en: 'Simplify API integration in Google Apps Script',
      },
      targetUsers: {
        ja: 'GASでAPI連携を行う開発者',
        en: 'Developers who integrate APIs with GAS',
      },
      tags: {
        en: ['google-apps-script', 'api', 'utility'],
        ja: ['google-apps-script', 'API', 'ユーティリティ'],
      },
    },
    functionality: {
      coreProblem: {
        ja: 'GASでのAPI呼び出しの複雑さと冗長性',
        en: 'Complexity and redundancy of API calls in GAS',
      },
      mainBenefits: [
        {
          title: {
            ja: 'シンプルなAPI',
            en: 'Simple API',
          },
          description: {
            ja: '直感的なメソッドでAPI連携が可能',
            en: 'Intuitive methods for API integration',
          },
        },
      ],
      usageExample: {
        functions: [
          { name: 'GasLibrary', summary: { ja: 'ライブラリ生成', en: 'Create library' } },
          { name: 'callApi', summary: { ja: 'API呼び出し', en: 'Call API' } },
        ],
        examples: [
          {
            title: { ja: '基本的な使用例', en: 'Basic Usage' },
            code: 'const lib = new GasLibrary();\nlib.callApi();',
            explanation: { ja: 'API呼び出しの例', en: 'API call example' },
          },
        ],
      },
    },
    seoInfo: {
      title: {
        ja: '【GAS】サンプルライブラリ - API連携',
        en: 'GAS Sample Library - API Integration',
      },
      description: {
        ja: 'Google Apps ScriptでAPI連携を簡素化するライブラリ。直感的なメソッドで開発効率を向上。',
        en: 'Library to simplify API integration in Google Apps Script. Improve development efficiency with intuitive methods.',
      },
    },
  };

  // xAIクライアントのモック（OpenAI SDK互換）
  const mockChatCompletionsCreate = vi.fn();
  const mockXaiClient = {
    chat: {
      completions: {
        create: mockChatCompletionsCreate,
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // XaiUtilsのgetClientメソッドをモック
    mockedXaiUtils.getClient.mockReturnValue(mockXaiClient as unknown as OpenAI);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('call', () => {
    test('正常なGitHubURLでライブラリ要約を生成できる', async () => {
      // xAI Grok APIのレスポンスをモック
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify(mockLibrarySummary),
            },
          },
        ],
      };
      mockChatCompletionsCreate.mockResolvedValue(mockResponse);

      // テスト実行
      const result = await GenerateLibrarySummaryService.call(mockParams);

      // 検証
      expect(mockedXaiUtils.getClient).toHaveBeenCalled();
      expect(mockChatCompletionsCreate).toHaveBeenCalledWith({
        model: 'grok-4-1-fast-reasoning',
        messages: [
          {
            role: 'user',
            content: expect.stringContaining(mockParams.githubUrl),
          },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'library_summary',
            strict: true,
            schema: expect.objectContaining({
              type: 'object',
              properties: expect.objectContaining({
                basicInfo: expect.any(Object),
                functionality: expect.any(Object),
                seoInfo: expect.any(Object),
              }),
              required: ['basicInfo', 'functionality', 'seoInfo'],
            }),
          },
        },
      });

      expect(result).toEqual(mockLibrarySummary);
    });

    test('xAI Grok APIが空のレスポンスを返した場合エラーになる', async () => {
      // 空のレスポンスをモック
      const mockResponse = {
        choices: [
          {
            message: {
              content: null,
            },
          },
        ],
      };
      mockChatCompletionsCreate.mockResolvedValue(mockResponse);

      // テスト実行とエラー検証
      await expect(GenerateLibrarySummaryService.call(mockParams)).rejects.toThrow(
        'xAI Grok API からの応答が空です'
      );
    });

    test('xAI Grok APIが不正なJSONを返した場合エラーになる', async () => {
      // 不正なJSONレスポンスをモック
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'invalid json content',
            },
          },
        ],
      };
      mockChatCompletionsCreate.mockResolvedValue(mockResponse);

      // テスト実行とエラー検証
      await expect(GenerateLibrarySummaryService.call(mockParams)).rejects.toThrow(
        'xAI Grok API からの応答をJSONとして解析できませんでした'
      );
    });

    test('xAI Grok APIでネットワークエラーが発生した場合はエラーを透過する', async () => {
      // ネットワークエラーをモック
      const networkError = new Error('Network Error: Failed to fetch');
      mockChatCompletionsCreate.mockRejectedValue(networkError);

      // テスト実行とエラー検証
      await expect(GenerateLibrarySummaryService.call(mockParams)).rejects.toThrow(
        'Network Error: Failed to fetch'
      );
    });

    test('buildPromptメソッドが適切なプロンプトを生成する', async () => {
      // xAI Grok APIのレスポンスをモック
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify(mockLibrarySummary),
            },
          },
        ],
      };
      mockChatCompletionsCreate.mockResolvedValue(mockResponse);

      // テスト実行
      await GenerateLibrarySummaryService.call(mockParams);

      // プロンプトの内容を検証
      const calledWith = mockChatCompletionsCreate.mock.calls[0][0];
      const content = calledWith.messages[0].content as string;
      expect(content).toContain(mockParams.githubUrl);
    });

    test('JSONスキーマが適切に定義されている', async () => {
      // xAI Grok APIのレスポンスをモック
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify(mockLibrarySummary),
            },
          },
        ],
      };
      mockChatCompletionsCreate.mockResolvedValue(mockResponse);

      // テスト実行
      await GenerateLibrarySummaryService.call(mockParams);

      // JSONスキーマの検証
      const calledWith = mockChatCompletionsCreate.mock.calls[0][0];
      const schema = calledWith.response_format.json_schema.schema;

      // basicInfo構造の検証
      expect(schema.properties.basicInfo.properties).toHaveProperty('libraryName');
      expect(schema.properties.basicInfo.properties).toHaveProperty('purpose');
      expect(schema.properties.basicInfo.properties).toHaveProperty('targetUsers');
      expect(schema.properties.basicInfo.properties).toHaveProperty('tags');

      // functionality構造の検証
      expect(schema.properties.functionality.properties).toHaveProperty('coreProblem');
      expect(schema.properties.functionality.properties).toHaveProperty('mainBenefits');
      expect(schema.properties.functionality.properties).toHaveProperty('usageExample');

      // seoInfo構造の検証
      expect(schema.properties.seoInfo.properties).toHaveProperty('title');
      expect(schema.properties.seoInfo.properties).toHaveProperty('description');

      // 必須フィールドの検証
      expect(schema.required).toContain('basicInfo');
      expect(schema.required).toContain('functionality');
      expect(schema.required).toContain('seoInfo');
      expect(schema.properties.basicInfo.required).toContain('libraryName');
      expect(schema.properties.basicInfo.required).toContain('purpose');
      expect(schema.properties.basicInfo.required).toContain('targetUsers');
      expect(schema.properties.basicInfo.required).toContain('tags');
      expect(schema.properties.functionality.required).toContain('coreProblem');
      expect(schema.properties.functionality.required).toContain('mainBenefits');
      expect(schema.properties.functionality.required).toContain('usageExample');
      expect(schema.properties.seoInfo.required).toContain('title');
      expect(schema.properties.seoInfo.required).toContain('description');

      // 厳密性の検証
      expect(schema.additionalProperties).toBe(false);
      expect(schema.properties.basicInfo.additionalProperties).toBe(false);
      expect(schema.properties.functionality.additionalProperties).toBe(false);
      expect(schema.properties.seoInfo.additionalProperties).toBe(false);
    });

    test('grok-4-1-fast-reasoningモデルと設定が正しく使用される', async () => {
      // xAI Grok APIのレスポンスをモック
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify(mockLibrarySummary),
            },
          },
        ],
      };
      mockChatCompletionsCreate.mockResolvedValue(mockResponse);

      // テスト実行
      await GenerateLibrarySummaryService.call(mockParams);

      // API呼び出し設定の検証
      const calledWith = mockChatCompletionsCreate.mock.calls[0][0];
      expect(calledWith.model).toBe('grok-4-1-fast-reasoning');
      expect(calledWith.response_format.type).toBe('json_schema');
      expect(calledWith.response_format.json_schema.strict).toBe(true);
    });
  });
});
