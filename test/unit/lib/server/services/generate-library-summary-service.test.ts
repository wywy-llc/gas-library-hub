import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { GenerateLibrarySummaryService } from '../../../../../src/lib/server/services/generate-library-summary-service.js';
import type {
  LibrarySummary,
  LibrarySummaryParams,
} from '../../../../../src/lib/types/library-summary.js';

// OpenAI SDK全体をモック
vi.mock('openai', () => ({
  default: vi.fn(),
}));

// OpenAIUtilsをモック
vi.mock('../../../../../src/lib/server/utils/openai-utils.js', () => ({
  OpenAIUtils: {
    getClient: vi.fn(),
  },
}));

import type OpenAI from 'openai';
import { OpenAIUtils } from '../../../../../src/lib/server/utils/openai-utils.js';

const mockedOpenAIUtils = vi.mocked(OpenAIUtils);

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
        ja: '// GASライブラリの使用例\nconst lib = new GasLibrary();\nlib.callApi();',
        en: '// GAS Library Usage Example\nconst lib = new GasLibrary();\nlib.callApi();',
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

  // OpenAIクライアントのモック
  const mockChatCompletionsCreate = vi.fn();
  const mockOpenAIClient = {
    chat: {
      completions: {
        create: mockChatCompletionsCreate,
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // OpenAIUtilsのgetClientメソッドをモック
    mockedOpenAIUtils.getClient.mockReturnValue(mockOpenAIClient as unknown as OpenAI);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('call', () => {
    test('正常なGitHubURLでライブラリ要約を生成できる', async () => {
      // OpenAI APIのレスポンスをモック
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
      expect(mockedOpenAIUtils.getClient).toHaveBeenCalled();
      expect(mockChatCompletionsCreate).toHaveBeenCalledWith({
        model: 'gpt-5',
        messages: [
          {
            role: 'user',
            content: expect.arrayContaining([
              expect.objectContaining({
                type: 'text',
                text: expect.stringContaining(mockParams.githubUrl),
              }),
              expect.objectContaining({
                type: 'file',
                file: expect.objectContaining({
                  filename: 'README.md',
                  file_data: expect.stringMatching(/^data:text\/markdown;base64,/),
                }),
              }),
            ]),
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
        reasoning_effort: 'medium',
      });

      expect(result).toEqual(mockLibrarySummary);
    });

    test('OpenAI APIが空のレスポンスを返した場合エラーになる', async () => {
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
        'OpenAI API からの応答が空です'
      );
    });

    test('OpenAI APIが不正なJSONを返した場合エラーになる', async () => {
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
        'OpenAI API からの応答をJSONとして解析できませんでした'
      );
    });

    test('OpenAI APIでネットワークエラーが発生した場合はエラーを透過する', async () => {
      // ネットワークエラーをモック
      const networkError = new Error('Network Error: Failed to fetch');
      mockChatCompletionsCreate.mockRejectedValue(networkError);

      // テスト実行とエラー検証
      await expect(GenerateLibrarySummaryService.call(mockParams)).rejects.toThrow(
        'Network Error: Failed to fetch'
      );
    });

    test('buildPromptメソッドが適切なプロンプトを生成する', async () => {
      // OpenAI APIのレスポンスをモック
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
      const content = calledWith.messages[0].content as Array<{
        type: string;
        text?: string;
        file?: { filename: string; file_data: string };
      }>;
      const textPart = content.find(part => part.type === 'text');
      expect(textPart?.text).toContain(mockParams.githubUrl);
    });

    test('JSONスキーマが適切に定義されている', async () => {
      // OpenAI APIのレスポンスをモック
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

    test('o3モデルと推論設定が正しく使用される', async () => {
      // OpenAI APIのレスポンスをモック
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
      expect(calledWith.model).toBe('gpt-5');
      expect(calledWith.reasoning_effort).toBe('medium');
      expect(calledWith.response_format.type).toBe('json_schema');
      expect(calledWith.response_format.json_schema.strict).toBe(true);
    });
  });
});
