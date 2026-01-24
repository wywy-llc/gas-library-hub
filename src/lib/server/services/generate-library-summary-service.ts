import { env } from '$env/dynamic/private';
import {
  LIBRARY_SUMMARY_JSON_SCHEMA,
  buildLibrarySummaryPrompt,
} from '$lib/server/prompts/library-summary-prompt.js';
import {
  ValidatedSummaryGeneratorService,
  type GenerationOptions,
  type ValidatedSummaryResult,
} from '$lib/server/services/validated-summary-generator-service.js';
import { GitHubApiUtils } from '$lib/server/utils/github-api-utils.js';
import { XaiUtils } from '$lib/server/utils/xai-utils.js';
import type { LibrarySummary, LibrarySummaryParams } from '$lib/types/library-summary.js';

/**
 * E2Eテスト用のモックデータを取得
 * リポジトリURLに基づいて適切なテストデータを選択
 */
function getE2EMockSummary(githubUrl: string): LibrarySummary {
  // リポジトリ名からテストデータを選択
  if (githubUrl.includes('oauth') || githubUrl.includes('auth')) {
    // OAuth認証ライブラリのモックデータ
    return {
      basicInfo: {
        libraryName: {
          ja: 'OAuth2認証ライブラリ',
          en: 'OAuth2 Authentication Library',
        },
        purpose: {
          ja: 'Google Apps ScriptでOAuth2認証を簡単に実装するためのライブラリ',
          en: 'Library for easy OAuth2 authentication implementation in Google Apps Script',
        },
        targetUsers: {
          ja: 'GAS開発者、OAuth2認証を必要とする開発者',
          en: 'GAS developers, OAuth2 authentication developers',
        },
        tags: {
          ja: ['OAuth2', '認証', 'セキュリティ', 'API'],
          en: ['OAuth2', 'authentication', 'security', 'API'],
        },
      },
      functionality: {
        coreProblem: {
          ja: 'Google Apps ScriptでのOAuth2認証実装の複雑さ',
          en: 'Complexity of OAuth2 authentication implementation in Google Apps Script',
        },
        mainBenefits: [
          {
            title: {
              ja: '簡単な認証実装',
              en: 'Easy Authentication Implementation',
            },
            description: {
              ja: '複雑なOAuth2フローを簡単なメソッド呼び出しで実現',
              en: 'Realize complex OAuth2 flow with simple method calls',
            },
          },
          {
            title: {
              ja: 'セキュリティ強化',
              en: 'Enhanced Security',
            },
            description: {
              ja: '安全なトークン管理と自動リフレッシュ機能',
              en: 'Secure token management and automatic refresh functionality',
            },
          },
        ],
        usageExample: {
          functions: [
            {
              name: 'OAuth2Lib',
              summary: { ja: 'OAuth2クライアント生成', en: 'Create OAuth2 client' },
            },
            {
              name: 'getAuthUrl',
              summary: { ja: '認証URLを生成', en: 'Generate auth URL' },
            },
            {
              name: 'getAccessToken',
              summary: { ja: 'アクセストークン取得', en: 'Get access token' },
            },
          ],
          examples: [
            {
              title: { ja: '基本的な認証フロー', en: 'Basic Authentication Flow' },
              code: `const oauth = new OAuth2Lib();
const authUrl = oauth.getAuthUrl('client_id', 'redirect_uri');
const token = oauth.getAccessToken('auth_code');`,
              explanation: {
                ja: 'OAuth2認証の基本的なフローを示します。認証URLを生成し、認証コードからアクセストークンを取得します。',
                en: 'Shows the basic OAuth2 authentication flow. Generates auth URL and gets access token from auth code.',
              },
            },
          ],
        },
      },
      seoInfo: {
        title: {
          ja: '【GAS】OAuth2認証ライブラリ - 簡単実装',
          en: 'GAS OAuth2 Authentication Library - Easy Implementation',
        },
        description: {
          ja: 'Google Apps ScriptでOAuth2認証を簡単に実装。複雑な認証フローを簡潔なメソッドで自動化し、開発時間を大幅に短縮。',
          en: 'Easy OAuth2 authentication implementation for Google Apps Script. Automate complex authentication flows with concise methods, significantly reducing development time.',
        },
      },
    };
  }

  // デフォルトのテストライブラリモックデータ
  return {
    basicInfo: {
      libraryName: {
        ja: 'テストライブラリ',
        en: 'Test Library',
      },
      purpose: {
        ja: 'テスト用のGoogle Apps Scriptライブラリ',
        en: 'Test Google Apps Script Library',
      },
      targetUsers: {
        ja: 'テスト開発者、テスト自動化エンジニア',
        en: 'Test developers, Test automation engineers',
      },
      tags: {
        ja: ['テスト', 'モック', 'E2E'],
        en: ['test', 'mock', 'e2e'],
      },
    },
    functionality: {
      coreProblem: {
        ja: 'E2Eテストでの実際のAPI呼び出しによるコスト発生',
        en: 'Cost incurred by actual API calls in E2E testing',
      },
      mainBenefits: [
        {
          title: {
            ja: 'コスト削減',
            en: 'Cost Reduction',
          },
          description: {
            ja: 'OpenAI APIの実際の呼び出しを避けてテスト実行コストを削減',
            en: 'Reduce test execution costs by avoiding actual OpenAI API calls',
          },
        },
        {
          title: {
            ja: '高速実行',
            en: 'Fast Execution',
          },
          description: {
            ja: 'モックデータの使用により、テストの実行速度を向上',
            en: 'Improve test execution speed by using mock data',
          },
        },
      ],
      usageExample: {
        functions: [
          {
            name: 'TestLibrary',
            summary: { ja: 'テストライブラリ生成', en: 'Create test library' },
          },
          {
            name: 'setMockData',
            summary: { ja: 'モックデータ設定', en: 'Set mock data' },
          },
          {
            name: 'runTest',
            summary: { ja: 'テスト実行', en: 'Run test' },
          },
        ],
        examples: [
          {
            title: { ja: '基本的なテスト実行', en: 'Basic Test Execution' },
            code: `const testLib = new TestLibrary();
testLib.setMockData('sample_data');
const result = testLib.runTest();`,
            explanation: {
              ja: 'テストライブラリの基本的な使用方法です。モックデータを設定してテストを実行します。',
              en: 'Basic usage of test library. Sets mock data and runs the test.',
            },
          },
        ],
      },
    },
    seoInfo: {
      title: {
        ja: '【GAS】テストライブラリ - E2E効率化',
        en: 'GAS Test Library - E2E Testing Efficiency',
      },
      description: {
        ja: 'Google Apps Script用テストライブラリ。モックデータでAPIコスト削減し、高速なE2Eテスト実行を実現。',
        en: 'Test library for Google Apps Script. Reduce API costs with mock data and achieve fast E2E test execution.',
      },
    },
  };
}

/**
 * OpenAI APIを使用してライブラリ要約を生成するサービス
 *
 * 使用例:
 * ```typescript
 * const summary = await GenerateLibrarySummaryService.call({
 *   githubUrl: 'https://github.com/owner/repo'
 * });
 * ```
 *
 * 動作原理:
 * 1. E2Eテスト環境では事前定義されたモックデータを返却
 * 2. GitHubからREADME.mdを取得（エラーハンドリング付き）
 * 3. 最適化されたプロンプトテンプレートで文字列生成を高速化
 * 4. 事前定義されたJSON Schemaでメモリ使用量を削減
 * 5. OpenAI o3モデルで高品質なライブラリ要約を生成
 */
export const GenerateLibrarySummaryService = (() => {
  /**
   * README取得の最適化
   * @private
   */
  const fetchReadmeContent = async (githubUrl: string): Promise<string> => {
    const ownerAndRepo = GitHubApiUtils.parseGitHubUrl(githubUrl);

    if (!ownerAndRepo) {
      return '';
    }

    try {
      const readme = await GitHubApiUtils.fetchReadme(ownerAndRepo.owner, ownerAndRepo.repo);
      return readme || '';
    } catch (error) {
      console.warn('README取得に失敗しました:', error);
      return '';
    }
  };

  /**
   * GitHubリポジトリの情報からライブラリ要約を生成する
   * @param params ライブラリ要約生成パラメータ
   * @returns 生成されたライブラリ要約
   */
  const call = async (params: LibrarySummaryParams): Promise<LibrarySummary> => {
    // E2Eテストモードの場合はモックデータを返す
    if (env.PLAYWRIGHT_TEST_MODE === 'true') {
      console.log('🤖 [E2E Mock] AI要約を生成中... (モックデータを使用)');
      // 実際のAPIレスポンス時間をシミュレート
      await new Promise(resolve => setTimeout(resolve, 100));
      return getE2EMockSummary(params.githubUrl);
    }

    // README取得の最適化（1回の取得で完了）
    const readmeContent = await fetchReadmeContent(params.githubUrl);

    // プロンプト生成（分離されたモジュールから取得）
    const prompt = buildLibrarySummaryPrompt(params.githubUrl);

    const client = XaiUtils.getClient();

    // README内容を直接プロンプトに埋め込む形式に変更
    const readmeSection = readmeContent
      ? `\n\n---\n\n## README.md Content\n\n${readmeContent}\n\n---`
      : '\n\n---\n\n## README.md Content\n\nREADME.mdが見つからないか、内容を取得できませんでした。\n\n---';

    // xAI Grok API呼び出し（OpenAI SDK互換）
    const response = await client.chat.completions.create({
      model: 'grok-4-1-fast-reasoning',
      messages: [
        {
          role: 'user',
          content: prompt + readmeSection,
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: LIBRARY_SUMMARY_JSON_SCHEMA,
      },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('xAI Grok API からの応答が空です');
    }

    try {
      const summary = JSON.parse(content) as LibrarySummary;
      return summary;
    } catch {
      throw new Error('xAI Grok API からの応答をJSONとして解析できませんでした');
    }
  };

  /**
   * バリデーション付きでライブラリ要約を生成する
   *
   * ソースコード分析 + AI生成 + バリデーション + 自動再生成を統合。
   * ハルシネーション（存在しないメソッドの創作）を防止する。
   *
   * @param params ライブラリ要約生成パラメータ
   * @param options 生成オプション
   * @returns 検証済み要約生成結果
   */
  const callWithValidation = async (
    params: LibrarySummaryParams,
    options: GenerationOptions = {}
  ): Promise<ValidatedSummaryResult> => {
    // E2Eテストモードの場合はモックデータを返す
    if (env.PLAYWRIGHT_TEST_MODE === 'true') {
      console.log('🤖 [E2E Mock] バリデーション付きAI要約を生成中... (モックデータを使用)');
      await new Promise(resolve => setTimeout(resolve, 100));
      return {
        summary: getE2EMockSummary(params.githubUrl),
        validationResult: undefined,
        attempts: 1,
        sourceAnalysis: undefined,
      };
    }

    return ValidatedSummaryGeneratorService.call(params.githubUrl, options);
  };

  return {
    call,
    callWithValidation,
  } as const;
})();
