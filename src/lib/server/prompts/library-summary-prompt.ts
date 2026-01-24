/**
 * GAS ライブラリ要約生成用プロンプトテンプレート
 *
 * @see GenerateLibrarySummaryService
 * @see LIBRARY_SUMMARY_JSON_SCHEMA for output format
 */

import type { ValidationError } from '$lib/types/source-analysis.js';

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
                description: 'Markdown形式のコードと解説。コードブロック（```javascript）を使用。',
              },
              en: {
                type: 'string',
                description: 'Code and explanation in Markdown. Use code blocks (```javascript).',
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

## Role

Google Apps Script (GAS) ライブラリの技術分析専門家。
開発者のライブラリ採用判断を支援する構造化データを生成する。

## Task

GitHubリポジトリのREADME.mdを分析し、構造化JSONを生成する。

## Input

\`\`\`yaml
github_url: {{GITHUB_URL}}
\`\`\`

---

## Constraints

### NEVER（絶対禁止）

- 存在しない機能・メソッドの創作
- 推測に基づく情報追加
- 主観的評価（「素晴らしい」「革新的」等）
- README未記載のコード例生成
- **文字数カウントの出力**（例：「〜（38字）」「〜(50 chars)」は厳禁。文末の括弧付き数字は全て禁止）

### ALWAYS（必須）

- 検証可能な情報のみ使用
- 情報不足時は「公開情報が不足しているため〜」と明記
- 全フィールドをja/en両言語で出力
- コード例はREADME記載のもののみ使用

---

## Analysis Process

7段階で分析を実行。各段階で推論を記録する。

| Phase | Focus | Output |
|-------|-------|--------|
| 1 | リポジトリ構造理解 | libraryName, tags (max 5) |
| 2 | 価値提案明確化 | purpose, coreProblem |
| 3 | ターゲットユーザー具体化 | targetUsers |
| 4 | 主要メリット抽出 | mainBenefits (3-5個) |
| 5 | 実用コード例作成 | usageExample (README準拠, ES6+, インラインコメント) |
| 6 | SEOメタデータ生成 | seoInfo |
| 7 | 最終検証 | JSON構造妥当性、全フィールド完全性 |

---

## Character Limits

| Field | ja | en | Format |
|-------|-----|-----|--------|
| purpose | 50字 | 50 chars | 1文 |
| coreProblem | 80字 | 80 chars | 1文 |
| targetUsers | 100字 | 100 chars | [レベル]の開発者で、[課題]を解決したい[文脈]を開発している方 |
| mainBenefits.title | 20字 | 20 chars | - |
| mainBenefits.description | 100字 | 100 chars | - |
| seoInfo.title | 30字前後 | 60 chars | 【GAS】で始まる |
| seoInfo.description | 120字前後 | 160 chars | - |

---

## Self-Validation Checklist

- [ ] 全メソッド名がREADMEに存在
- [ ] 日英両言語が全フィールドに存在
- [ ] Character Limitsを遵守
- [ ] 主観的表現を排除
- [ ] JSON構造が妥当
- [ ] **出力テキストに「（XX字）」「(XX chars)」等の文字数表記が含まれていない**
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

> **Warning**: usageExampleでは上記の公開APIのみを使用すること。
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
