import { env } from '$env/dynamic/private';
import { GitHubApiUtils } from '$lib/server/utils/github-api-utils.js';
import { OpenAIUtils } from '$lib/server/utils/openai-utils.js';
import type { LibrarySummary, LibrarySummaryParams } from '$lib/types/library-summary.js';

/**
 * OpenAI API用のJSON Schemaキャッシュ（メモリ使用量削減）
 */
const LIBRARY_SUMMARY_JSON_SCHEMA = {
  name: 'library_summary',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      basicInfo: {
        type: 'object',
        properties: {
          libraryName: {
            type: 'object',
            properties: {
              ja: { type: 'string' },
              en: { type: 'string' },
            },
            required: ['ja', 'en'],
            additionalProperties: false,
          },
          purpose: {
            type: 'object',
            properties: {
              ja: { type: 'string' },
              en: { type: 'string' },
            },
            required: ['ja', 'en'],
            additionalProperties: false,
          },
          targetUsers: {
            type: 'object',
            properties: {
              ja: { type: 'string' },
              en: { type: 'string' },
            },
            required: ['ja', 'en'],
            additionalProperties: false,
          },
          tags: {
            type: 'object',
            properties: {
              en: {
                type: 'array',
                items: { type: 'string' },
              },
              ja: {
                type: 'array',
                items: { type: 'string' },
              },
            },
            required: ['en', 'ja'],
            additionalProperties: false,
          },
        },
        required: ['libraryName', 'purpose', 'targetUsers', 'tags'],
        additionalProperties: false,
      },
      functionality: {
        type: 'object',
        properties: {
          coreProblem: {
            type: 'object',
            properties: {
              ja: { type: 'string' },
              en: { type: 'string' },
            },
            required: ['ja', 'en'],
            additionalProperties: false,
          },
          mainBenefits: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: {
                  type: 'object',
                  properties: {
                    ja: { type: 'string' },
                    en: { type: 'string' },
                  },
                  required: ['ja', 'en'],
                  additionalProperties: false,
                },
                description: {
                  type: 'object',
                  properties: {
                    ja: { type: 'string' },
                    en: { type: 'string' },
                  },
                  required: ['ja', 'en'],
                  additionalProperties: false,
                },
              },
              required: ['title', 'description'],
              additionalProperties: false,
            },
          },
          usageExample: {
            type: 'object',
            properties: {
              ja: {
                type: 'string',
                description:
                  'Markdown形式で記述された、コードとその解説。コードブロック（```javascript）を使用すること。',
              },
              en: {
                type: 'string',
                description:
                  'Code and its explanation in Markdown format. Use code blocks (```javascript).',
              },
            },
            required: ['ja', 'en'],
            additionalProperties: false,
          },
        },
        required: ['coreProblem', 'mainBenefits', 'usageExample'],
        additionalProperties: false,
      },
      seoInfo: {
        type: 'object',
        properties: {
          title: {
            type: 'object',
            properties: {
              ja: {
                type: 'string',
                description: 'SEO向けのタイトルタグ（日本語30文字前後）',
              },
              en: {
                type: 'string',
                description: 'Title tag for SEO (around 60 characters)',
              },
            },
            required: ['ja', 'en'],
            additionalProperties: false,
          },
          description: {
            type: 'object',
            properties: {
              ja: {
                type: 'string',
                description: 'SEO向けのdescriptionタグ（日本語120文字前後）',
              },
              en: {
                type: 'string',
                description: 'Description tag for SEO (around 160 characters)',
              },
            },
            required: ['ja', 'en'],
            additionalProperties: false,
          },
        },
        required: ['title', 'description'],
        additionalProperties: false,
      },
    },
    required: ['basicInfo', 'functionality', 'seoInfo'],
    additionalProperties: false,
  },
} as const;

/**
 * プロンプトテンプレート（文字列結合のパフォーマンス最適化）
 */
const PROMPT_TEMPLATE = `
# Role
あなたは、Google Apps Script (GAS) ライブラリの価値を開発者視点で見抜き、その本質を的確に言語化する専門家です。

# Goal
提供されたGitHubリポジトリを分析・推論し、他の開発者がライブラリの採用を迅速かつ正確に判断できる、高品質なJSONデータを生成します。

# Input
- GitHub Repository URL: {{GITHUB_URL}}
- GitHub README.md

## GitHub README

\`\`\`
{{README_CONTENT}}
\`\`\`

# Critical Rules

## 正確性
- **検証可能な情報のみ使用** (推測・創作・誇張禁止)
- 存在しない機能は絶対に記述しない
- 情報不足時は丁寧に明記

## 中立性
- 主観的評価を排除 (「素晴らしい」「革新的な」等禁止)
- 事実の列挙に徹する
- 制約・課題も適切に言及

## 情報不足時の表現
**基本ルール**: 「READMEなどの公開情報が不足しているため、〜を提示できません。」

# Reasoning Process
以下の思考プロセスに従って、JSONオブジェクトを段階的に構築してください。

### Step 1: 全体分析 (High-Level Analysis)
リポジトリ全体、特にREADMEを読み込み、ライブラリの全体像を把握します。
- **Output:** \`libraryName\`, \`tags\`

### Step 2: 提供価値の定義 (Core Value Proposition)
ライブラリの存在意義を明確にします。
- **\`purpose\`:** **このライブラリが「何をするものか？」** を一文で定義します。
- **\`coreProblem\`:** **このライブラリが「なぜ必要なのか？」** を、ライブラリが無い場合の課題や複雑さを基に一文で定義します。

### Step 3: 対象ユーザー像の解像度向上 (Target User Profile)
最も恩恵を受けるユーザー像を具体的に推論します。
- 以下の3軸を考慮し、**一行の文章**に統合してください。
  - **レベル (Level):** GAS初心者、中級者、上級者など
  - **課題 (Problem):** どんな目的や課題を持つか (例: API連携の効率化)
  - **文脈 (Context):** 何を開発しているか (例: 社内ツール、公開アドオン)
- **Output:** \`targetUsers\`

### Step 4: 主要な利点の抽出 (Key Benefits)
ライブラリの価値を挙げます。
- **\`title\`:** 利点を端的に表すタイトル。(不明な場合: "公開情報の不足")
- **\`description\`:** その利点が「どのように」実現されるかの技術的な説明。(不明な場合: "READMEなどの公開情報が不足しているため、特徴を提示できません。")
- **Output:** \`mainBenefits\`

### Step 5: 段階的なコード例の作成 (Tiered Code Examples)
READMEのコード例を基盤とし、**Step 3で定義した対象ユーザー**を意識して、以下要件に沿ったコード例をマークダウン形式で出力します。
- **目的:** 最小限のコードで、ライブラリが「動く」ことを示す。
- **内容:** コピペですぐに試せる、最も簡単なコードスニペット。
- **基本要件:**
  - H3見出し(\`###\`)を付けてください。
  - 各コードの見出しは、\`### 内容を表すタイトル\` という形式にしてください。（例: \`### スプレッドシートのデータをJSON形式でS3にアップする\`）
  - **ソースコードに存在しないメソッド、関数は絶対に出力しないでください**
  - **GASで動作するコードのみ出力してください**
  - コードブロック内には、処理の流れがわかるような**インラインコメントを必ず含めてください。**
  - **コードブロックと、そのコードを解説する文章の両方を含めてください。**
  - コードは**ES6+構文**の\`javascript\`コードブロックで記述します。
- **Output:** \`usageExample\`

### Step 6: SEOメタデータの生成 (SEO Metadata Generation)
これまでのステップで分析した情報（libraryName, purpose, coreProblem, targetUsers）を総動員し、高いクリック率(CTR)を目指すSEOメタデータを生成します。

- **\`title\` (ja/en):**
  - **検索キーワード:** ユーザーが検索時に使用するであろう、最も重要なキーワード（例: "GAS OAuth2", "Google Apps Script API 連携"）を**タイトルの前半に**含めてください。
  - **具体性と便益:** ライブラリが「何をするものか」が一目で分かり、ユーザーが得られる「具体的なメリット」が伝わるように記述します。
  - **フォーマット:** 日本語タイトルには \`【GAS】\` という接頭辞を付けて、対象技術を明確にしてください。
  - **文字数:** 検索結果で省略されないよう、**日本語は30文字前後**、**英語は60文字以内**に厳守してください。
  - **Output:** \`seoInfo.title\`
- **\`description\` (ja/en):**
  - **検索意図への回答:** ユーザーが抱えるであろう課題（\`coreProblem\`）に触れ、このライブラリがその解決策であることを明確に示してください。
  - **価値の要約:** \`targetUsers\` が誰で、\`mainBenefits\` が何であるかを簡潔に要約して含めます。
  - **具体性:** 抽象的な表現を避け、「〜を自動化」「〜の時間を短縮」のように、具体的なアクションや結果を記述します。
  - **文字数:** **日本語は120文字前後**、**英語は160文字以内**に厳守してください。
  - **Output:** \`seoInfo.description\`

**重要**: SEO情報では情報不足の断り文は使用しない
- 詳細情報が不足していても、リポジトリ名、技術分野、基本目的から有用なSEO情報を作成

### Step 7: 最終生成 (Finalization)
上記ステップで得られたすべての要素を、スキーマに従って完全なJSONオブジェクトに組み立てます。
- **要件:** 全てのテキストフィールドは、日本語(ja)と英語(en)の両方で生成してください。
` as const;

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
          ja: `// OAuth2認証ライブラリの基本的な使用例
const oauth = new OAuth2Lib();
// 認証URLを生成
const authUrl = oauth.getAuthUrl('client_id', 'redirect_uri');
// アクセストークンを取得
const token = oauth.getAccessToken('auth_code');`,
          en: `// Basic usage example of OAuth2 authentication library
const oauth = new OAuth2Lib();
// Generate authentication URL
const authUrl = oauth.getAuthUrl('client_id', 'redirect_uri');
// Get access token
const token = oauth.getAccessToken('auth_code');`,
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
        ja: `// テストライブラリの基本的な使用例
const testLib = new TestLibrary();
// モックデータを設定
testLib.setMockData('sample_data');
// テストを実行
const result = testLib.runTest();`,
        en: `// Basic usage example of test library
const testLib = new TestLibrary();
// Set mock data
testLib.setMockData('sample_data');
// Run test
const result = testLib.runTest();`,
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
export class GenerateLibrarySummaryService {
  /**
   * GitHubリポジトリの情報からライブラリ要約を生成する
   * @param params ライブラリ要約生成パラメータ
   * @returns 生成されたライブラリ要約
   */
  static async call(params: LibrarySummaryParams): Promise<LibrarySummary> {
    // E2Eテストモードの場合はモックデータを返す
    if (env.PLAYWRIGHT_TEST_MODE === 'true') {
      console.log('🤖 [E2E Mock] AI要約を生成中... (モックデータを使用)');
      // 実際のAPIレスポンス時間をシミュレート
      await new Promise(resolve => setTimeout(resolve, 100));
      return getE2EMockSummary(params.githubUrl);
    }

    // README取得の最適化（1回の取得で完了）
    const readmeContent = await this.fetchReadmeContent(params.githubUrl);

    // プロンプト生成の最適化（テンプレート使用）
    const prompt = this.buildOptimizedPrompt(params.githubUrl, readmeContent);

    const client = OpenAIUtils.getClient();

    // 最適化されたAPI呼び出し（事前定義されたJSON Schema使用）
    const response = await client.chat.completions.create({
      model: 'gpt-5',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: LIBRARY_SUMMARY_JSON_SCHEMA,
      },
      reasoning_effort: 'medium',
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('OpenAI API からの応答が空です');
    }

    try {
      const summary = JSON.parse(content) as LibrarySummary;
      return summary;
    } catch {
      throw new Error('OpenAI API からの応答をJSONとして解析できませんでした');
    }
  }

  /**
   * README取得の最適化
   * @private
   */
  private static async fetchReadmeContent(githubUrl: string): Promise<string> {
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
  }

  /**
   * プロンプト生成の最適化
   * @private
   */
  private static buildOptimizedPrompt(githubUrl: string, readmeContent: string): string {
    return PROMPT_TEMPLATE.replace('{{GITHUB_URL}}', githubUrl).replace(
      '{{README_CONTENT}}',
      readmeContent || 'README.mdが見つからないか、内容を取得できませんでした。'
    );
  }
}
