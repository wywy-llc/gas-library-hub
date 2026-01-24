/**
 * GAS ライブラリ要約生成用プロンプトテンプレート
 *
 * @see GenerateLibrarySummaryService
 * @see LIBRARY_SUMMARY_JSON_SCHEMA for output format
 */

import type { ValidationError } from '$lib/types/source-analysis.js';

/**
 * 多言語テキストのJSON Schema定義
 */
const BILINGUAL_TEXT_SCHEMA = {
  type: 'object',
  properties: {
    ja: { type: 'string' },
    en: { type: 'string' },
  },
  required: ['ja', 'en'],
  additionalProperties: false,
} as const;

/**
 * xAI Grok API用のJSON Schema（Single Source of Truth）
 */
export const LIBRARY_SUMMARY_JSON_SCHEMA = {
  name: 'library_summary',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      basicInfo: {
        type: 'object',
        properties: {
          libraryName: BILINGUAL_TEXT_SCHEMA,
          purpose: BILINGUAL_TEXT_SCHEMA,
          targetUsers: BILINGUAL_TEXT_SCHEMA,
          tags: {
            type: 'object',
            properties: {
              en: { type: 'array', items: { type: 'string' } },
              ja: { type: 'array', items: { type: 'string' } },
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
          coreProblem: BILINGUAL_TEXT_SCHEMA,
          mainBenefits: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: BILINGUAL_TEXT_SCHEMA,
                description: BILINGUAL_TEXT_SCHEMA,
              },
              required: ['title', 'description'],
              additionalProperties: false,
            },
          },
          usageExample: {
            type: 'object',
            properties: {
              functions: {
                type: 'array',
                description: '主要関数一覧（1-3個）',
                items: {
                  type: 'object',
                  properties: {
                    name: {
                      type: 'string',
                      description:
                        '関数名またはメソッド名（例: getSheetData, OAuth2.createService）',
                    },
                    summary: {
                      type: 'object',
                      properties: {
                        ja: { type: 'string', description: '1行要約（20字以内）' },
                        en: { type: 'string', description: '1行要約（30字以内）' },
                      },
                      required: ['ja', 'en'],
                      additionalProperties: false,
                    },
                  },
                  required: ['name', 'summary'],
                  additionalProperties: false,
                },
              },
              examples: {
                type: 'array',
                description: '使用例（1-3個）',
                items: {
                  type: 'object',
                  properties: {
                    title: {
                      type: 'object',
                      properties: {
                        ja: { type: 'string', description: '例のタイトル（日本語）' },
                        en: { type: 'string', description: '例のタイトル（英語）' },
                      },
                      required: ['ja', 'en'],
                      additionalProperties: false,
                    },
                    code: {
                      type: 'string',
                      description:
                        'JSDocコメント（実装ポイント3点 + 対応コード）で始まるJavaScriptコード（例: "/**\\n * タイトル\\n * ・ポイント1: コード断片1\\n * ・ポイント2: コード断片2\\n * ・ポイント3: コード断片3\\n */\\nfunction example() {}"）',
                    },
                  },
                  required: ['title', 'code'],
                  additionalProperties: false,
                },
              },
            },
            required: ['functions', 'examples'],
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
              ja: { type: 'string', description: 'SEOタイトル（日本語30文字前後）' },
              en: { type: 'string', description: 'SEO title (around 60 characters)' },
            },
            required: ['ja', 'en'],
            additionalProperties: false,
          },
          description: {
            type: 'object',
            properties: {
              ja: {
                type: 'string',
                description: 'SEO description（日本語120文字前後）',
              },
              en: {
                type: 'string',
                description: 'SEO description (around 160 characters)',
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
 * 文字数制限定義（プロンプト内で参照）
 */
export const CHARACTER_LIMITS = {
  purpose: { ja: 50, en: 50 },
  coreProblem: { ja: 80, en: 80 },
  targetUsers: { ja: 100, en: 100 },
  benefitTitle: { ja: 20, en: 20 },
  benefitDescription: { ja: 100, en: 100 },
  functionSummary: { ja: 20, en: 30 },
  seoTitle: { ja: 30, en: 60 },
  seoDescription: { ja: 120, en: 160 },
} as const;

/**
 * プロンプトテンプレート
 *
 * プレースホルダー:
 * - {{GITHUB_URL}}: GitHubリポジトリのURL
 */
export const LIBRARY_SUMMARY_PROMPT_TEMPLATE = `
# GAS Library Analyzer

## §1 Identity

\`\`\`yaml
role: GASライブラリ技術分析専門家
mission: 開発者のライブラリ採用判断を支援する構造化データ生成
input: GitHubリポジトリのREADME.md
output: 構造化JSON（ja/en両言語）
\`\`\`

### Input

\`\`\`yaml
github_url: {{GITHUB_URL}}
\`\`\`

## §2 Constraints

### NEVER

- 存在しない機能・メソッドの創作
- 推測に基づく情報追加
- 主観的評価（「素晴らしい」「革新的」等）
- README未記載のコード例生成
- 文字数カウントの出力（「〜（38字）」「〜(50 chars)」）

### ALWAYS

- 検証可能な情報のみ使用
- 情報不足時は「公開情報が不足しているため〜」と明記
- 全フィールドをja/en両言語で出力
- コード例はREADME記載のもののみ使用

## §3 Output Schema

### 3.1 Character Limits

| Field | ja | en | Format |
|-------|-----|-----|--------|
| purpose | 50字 | 50 chars | 1文 |
| coreProblem | 80字 | 80 chars | 1文 |
| targetUsers | 100字 | 100 chars | [レベル]の開発者で、[課題]を解決したい[文脈]を開発している方 |
| mainBenefits.title | 20字 | 20 chars | - |
| mainBenefits.description | 100字 | 100 chars | - |
| functions[].summary | 20字 | 30 chars | 1行要約 |
| seoInfo.title | 30字前後 | 60 chars | 【GAS】で始まる |
| seoInfo.description | 120字前後 | 160 chars | - |

### 3.2 usageExample Structure

\`\`\`yaml
functions: # 1-3個
  - name: "関数名（例: OAuth2.createService）"
    summary: { ja: "1行要約（20字）", en: "Summary（30 chars）" }

examples: # 1-3個
  - title: { ja: "例のタイトル", en: "Example title" }
    code: | # JSDocコメント（実装ポイント3点 + 対応コード）で始まるJavaScriptコード
      /**
       * [title.jaの内容]
       * ・[実装ポイント1]: [対応するコード断片]
       * ・[実装ポイント2]: [対応するコード断片]
       * ・[実装ポイント3]: [対応するコード断片]
       */
      function example() {
        // 実際のコード
      }
\`\`\`

#### JSDocコメント形式

各実装ポイントには対応するコード断片を明記すること。

**フォーマット:** \`・[ポイント説明]: [対応コード]\`

**例:**
\`\`\`javascript
/**
 * Drive OAuth2サービス作成
 * ・Google共通エンドポイント設定: OAuth2.createService('drive')
 * ・クライアント認証情報設定: setClientId(...).setClientSecret(...)
 * ・コールバックとスコープ設定: setCallbackFunction(...).setPropertyStore(...)
 */
function getDriveService_() {
  return OAuth2.createService('drive')
      .setAuthorizationBaseUrl('https://accounts.google.com/o/oauth2/auth')
      .setTokenUrl('https://accounts.google.com/o/oauth2/token')
      .setClientId('...')
      .setClientSecret('...')
      .setCallbackFunction('authCallback')
      .setPropertyStore(PropertiesService.getUserProperties());
}
\`\`\`

> **重要**: codeフィールドは必ずJSDocコメント（実装ポイント3点 + 対応コード）で始めること。

### 3.3 examples一貫性ルール

- 複数例で同一関数を参照する場合、関数名を統一
- 例: 例1で \`getService_()\` を呼ぶなら、例2で同名の関数を定義
- 禁止: 例1で \`getService_()\`、例2で \`getDriveService_()\` のような不整合

## §4 Analysis Process

| Phase | Output | Limits |
|-------|--------|--------|
| 1. リポジトリ構造理解 | libraryName, tags (max 5) | - |
| 2. 価値提案明確化 | purpose, coreProblem | §3.1 |
| 3. ターゲットユーザー具体化 | targetUsers | §3.1 |
| 4. 主要メリット抽出 | mainBenefits (1-3個) | §3.1 |
| 5. 使用例作成 | usageExample | §3.2, §3.3 |
| 6. SEOメタデータ生成 | seoInfo | §3.1 |
| 7. 最終検証 | JSON妥当性確認 | - |

## §5 Validation Checklist

\`\`\`yaml
content:
  - 全メソッド名がREADMEに存在
  - 主観的表現を排除
  - 出力テキストに文字数表記なし

format:
  - 日英両言語が全フィールドに存在
  - §3.1 Character Limits遵守
  - JSON構造が妥当

usageExample:
  - functions: 1-3個
  - examples: 1-3個
  - code: JSDocコメント（実装ポイント3点 + 対応コード）で始まる（§3.2）
  - 各ポイントに「: [対応コード断片]」が付与されている
  - examples間の関数呼び出しが一致（§3.3）
\`\`\`
` as const;

/**
 * プロンプトにGitHubのURLを埋め込む
 */
export function buildLibrarySummaryPrompt(githubUrl: string): string {
  return LIBRARY_SUMMARY_PROMPT_TEMPLATE.replace('{{GITHUB_URL}}', githubUrl);
}

/**
 * ソースコード情報付きプロンプトを生成
 */
export function buildLibrarySummaryPromptWithSource(
  githubUrl: string,
  sourceSummary: string
): string {
  const basePrompt = buildLibrarySummaryPrompt(githubUrl);

  const sourceSection = `
---

## Source Code Analysis

${sourceSummary}

> **Warning**: usageExample.examples[].code および usageExample.functions[].name では上記の公開APIのみを使用すること。
> 上記未記載のメソッド・クラス使用はバリデーションエラーとなる。
> README未記載メソッドの創作はConstraints違反。
`;

  // Insert after Input section
  return basePrompt.replace(/^(### Input[\s\S]*?```\n)/m, `$1${sourceSection}`);
}

/**
 * 再生成用プロンプトを生成（バリデーションエラー情報付き）
 */
export function buildRegenerationPrompt(
  basePrompt: string,
  validationErrors: ValidationError[]
): string {
  const errorLines = validationErrors.map(e => {
    let line = `- **[${e.language}]** ${e.message}`;
    line += `\n  - 無効: \`${e.invalidCall}\``;
    if (e.suggestions && e.suggestions.length > 0) {
      line += `\n  - 代替案: ${e.suggestions.map(s => `\`${s}\``).join(', ')}`;
    }
    return line;
  });

  const errorSection = `
---

## Previous Errors

前回生成でバリデーションエラー発生。以下を修正すること：

${errorLines.join('\n')}

### 修正方針

1. Source Code Analysis記載のAPIのみ使用
2. README未記載メソッド・クラスの創作禁止
3. 提案された代替案を使用
`;

  return basePrompt + errorSection;
}
