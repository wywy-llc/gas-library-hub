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
                      description: 'JavaScriptコード（言語タグなし、コメント付き）',
                    },
                    explanation: {
                      type: 'object',
                      properties: {
                        ja: {
                          type: 'string',
                          description:
                            'コード例のJSDocとして記載する実装ポイント3点（例: "・認証サービスの初期化\\n・スコープの設定\\n・コールバックURLの指定"）',
                        },
                        en: {
                          type: 'string',
                          description:
                            '3 implementation points as JSDoc for the code example (e.g., "・Initialize auth service\\n・Configure scopes\\n・Set callback URL")',
                        },
                      },
                      required: ['ja', 'en'],
                      additionalProperties: false,
                    },
                  },
                  required: ['title', 'code', 'explanation'],
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

## §1 Role

Google Apps Script (GAS) ライブラリの技術分析専門家。
開発者のライブラリ採用判断を支援する構造化データを生成する。

## §2 Task

GitHubリポジトリのREADME.mdを分析し、構造化JSONを生成する。

### Input

\`\`\`yaml
github_url: {{GITHUB_URL}}
\`\`\`

---

## §3 Constraints

### NEVER（絶対禁止）

- 存在しない機能・メソッドの創作
- 推測に基づく情報追加
- 主観的評価（「素晴らしい」「革新的」等）
- README未記載のコード例生成
- **文字数カウントの出力**（「〜（38字）」「〜(50 chars)」は厳禁）

### ALWAYS（必須）

- 検証可能な情報のみ使用
- 情報不足時は「公開情報が不足しているため〜」と明記
- 全フィールドをja/en両言語で出力
- コード例はREADME記載のもののみ使用

---

## §4 Character Limits

全フィールドの文字数制限（単一定義）。

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

---

## §5 Analysis Process

7段階で分析を実行。各段階で推論を記録する。

### Phase 1: リポジトリ構造理解

**Output:** libraryName, tags (max 5)

### Phase 2: 価値提案明確化

**Output:** purpose, coreProblem
**Limits:** §4参照

### Phase 3: ターゲットユーザー具体化

**Output:** targetUsers
**Limits:** §4参照

### Phase 4: 主要メリット抽出

**Output:** mainBenefits (1-3個)
**Limits:** §4参照

### Phase 5: 使用例作成

**Output:** usageExample.functions (1-3個) + usageExample.examples (1-3個)

#### §5.1 functions（主要関数一覧）

- README記載の主要関数/メソッドを1-3個抽出
- 各関数に1行要約（§4参照: ja 20字, en 30字）

#### §5.2 examples（使用例）

- README記載のコード例を1-3個抽出
- 各例に title, code, explanation を含める
- codeは言語タグなしの純粋なJavaScript（コメント付き可）
- **explanation形式**: コード例のJSDocとして記載する実装ポイント3点
  - 形式: \`"・ポイント1\\n・ポイント2\\n・ポイント3"\`
  - 内容: 設定意図、API使用法、注意点など
  - 用途: UIでコード例の上部にJSDocコメントとして表示される

**code + explanation の出力イメージ:**
\`\`\`javascript
/**
 * OAuth2サービスの作成
 * ・認証サービスの初期化
 * ・スコープの設定
 * ・コールバックURLの指定
 */
function getService_() {
  return OAuth2.createService('drive')
    .setAuthorizationBaseUrl('https://accounts.google.com/o/oauth2/auth')
    .setTokenUrl('https://oauth2.googleapis.com/token')
    .setClientId(CLIENT_ID)
    .setClientSecret(CLIENT_SECRET)
    .setCallbackFunction('authCallback')
    .setPropertyStore(PropertiesService.getUserProperties())
    .setScope('https://www.googleapis.com/auth/drive');
}
\`\`\`

#### §5.3 一貫性ルール（必須）

- 複数の使用例がある場合、**後の例が前の例で定義した関数を参照する場合は、必ず同じ関数名を使用**
- 例: 例1で \`getService_()\` を呼ぶなら、別の例で \`getService_()\` を定義
- **禁止**: 例1で \`getService_()\` を呼び、例2で \`getDriveService_()\` を定義するような不整合
- 使用例の構成パターン:
  1. **サービス作成**（必須）: OAuth2.createService等でサービスを作成する関数を定義
  2. **サービス利用**（任意）: 前の例で定義した関数を呼び出して使用
  3. **コールバック処理**（任意）: フローの完結処理

### Phase 6: SEOメタデータ生成

**Output:** seoInfo
**Limits:** §4参照

### Phase 7: 最終検証

**Output:** JSON構造妥当性、全フィールド完全性

---

## §6 Self-Validation Checklist

- [ ] 全メソッド名がREADMEに存在
- [ ] 日英両言語が全フィールドに存在
- [ ] §4 Character Limitsを遵守
- [ ] 主観的表現を排除
- [ ] JSON構造が妥当
- [ ] usageExample: functions 1-3個、examples 1-3個（§5.1, §5.2）
- [ ] explanation: JSDoc形式の実装ポイント3点（§5.2参照）
- [ ] 出力テキストに文字数表記なし（§3 NEVER参照）
- [ ] examples間の関数呼び出しが一致（§5.3参照）
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
  return basePrompt.replace(/^(## Input[\s\S]*?```\n)/m, `$1${sourceSection}`);
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
