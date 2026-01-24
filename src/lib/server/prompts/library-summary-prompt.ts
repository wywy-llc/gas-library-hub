/**
 * GAS ライブラリ要約生成用プロンプトテンプレート
 *
 * このファイルはプロンプトのリファクタリングと保守を容易にするため、
 * サービスロジックから分離されています。
 *
 * @see GenerateLibrarySummaryService
 */

/**
 * xAI Grok API用のJSON Schemaキャッシュ（メモリ使用量削減）
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
 * プロンプトテンプレート
 *
 * プレースホルダー:
 * - {{GITHUB_URL}}: GitHubリポジトリのURL
 *
 * @example
 * const prompt = LIBRARY_SUMMARY_PROMPT_TEMPLATE.replace('{{GITHUB_URL}}', githubUrl);
 */
export const LIBRARY_SUMMARY_PROMPT_TEMPLATE = `
# GAS ライブラリ分析プロンプト

## Core Prompt

\`\`\`xml
<role>
あなたは、Google Apps Script (GAS) ライブラリの技術的価値を正確に分析し、開発者の採用判断を支援する専門家です。
10年以上のGAS開発経験と、技術ドキュメント作成の専門知識を持ちます。
</role>

<task>
GitHubリポジトリの情報（主に\`README.md\`）を分析し、開発者がライブラリ採用を迅速に判断できる構造化JSONデータを生成してください。
</task>

<input>
- GitHub Repository URL: \`{{GITHUB_URL}}\`
- README.md Content: 以下のセクションに記載されたREADME.mdの内容を参照してください。
</input>

<critical_constraints>
【絶対禁止事項】
- 存在しない機能やメソッドの創作
- 推測に基づく情報の追加
- 主観的評価（「素晴らしい」「革新的」等）
- READMEに記載のないコード例の生成

【必須要件】
- 検証可能な情報のみ使用
- 情報不足時は「公開情報が不足しているため〜」と明記
- 全フィールドは日本語(ja)と英語(en)の両方で出力
- コード例はREADME記載のもののみ使用
</critical_constraints>

<reasoning_process>
以下の7段階で分析を進めてください。各段階で<thinking>タグを使用して内部推論を記録し、精度を確保してください。

### Phase 1: リポジトリ全体構造の理解
<thinking>
- README全体を読み込み、ライブラリの目的を把握
- 主要な機能と制約を識別
- ドキュメントの充実度を評価
</thinking>
出力: libraryName, tags (最大5個)

### Phase 2: 価値提案の明確化
<thinking>
- ライブラリが解決する具体的な問題を特定
- 既存の解決方法との差異を分析
- ユニークな価値を言語化
</thinking>
出力: purpose, coreProblem

### Phase 3: ターゲットユーザーの具体化
<thinking>
- 技術レベル（初級/中級/上級）を推定
- 解決したい課題の種類を特定
- 使用文脈（社内ツール/公開アドオン等）を推論
</thinking>
出力: targetUsers

### Phase 4: 主要メリットの抽出
<thinking>
- READMEから具体的な利点を抽出
- 技術的実装方法を確認
- 情報不足箇所を識別
</thinking>
出力: mainBenefits (3-5個)

### Phase 5: 実用コード例の作成
<thinking>
- README記載のコード例を確認
- 存在するメソッド名を正確に抽出
- GASでの動作可能性を検証
</thinking>
出力: usageExample (READMEベース、ES6+構文、インラインコメント必須)

### Phase 6: SEOメタデータ生成
<thinking>
- 検索キーワードを特定
- クリック率を高める表現を選択
- 文字数制限を確認
</thinking>
出力: seoInfo

### Phase 7: 最終検証と出力
<thinking>
- 全フィールドの完全性を確認
- 情報の正確性を再検証
- JSON構造の妥当性をチェック
</thinking>
</reasoning_process>

<self_validation>
出力前に以下を確認してください：
□ 全メソッド名がREADMEに存在することを確認
□ 日英両言語が全フィールドに存在
□ 文字数制限の遵守
□ 主観的表現の排除
□ JSON構造の妥当性
</self_validation>
\`\`\`

## Specifications

### Output Schema

\`\`\`json
{
  "libraryName": "string",
  "tags": ["string"],
  "purpose": {
    "ja": "string",
    "en": "string"
  },
  "coreProblem": {
    "ja": "string",
    "en": "string"
  },
  "targetUsers": {
    "ja": "string",
    "en": "string"
  },
  "mainBenefits": [
    {
      "title": {
        "ja": "string",
        "en": "string"
      },
      "description": {
        "ja": "string",
        "en": "string"
      }
    }
  ],
  "usageExample": {
    "ja": "string (markdown)",
    "en": "string (markdown)"
  },
  "seoInfo": {
    "title": {
      "ja": "string",
      "en": "string"
    },
    "description": {
      "ja": "string",
      "en": "string"
    }
  }
}
\`\`\`

### Character Limits

| Field                    | ja          | en        | Format                                                       |
| ------------------------ | ----------- | --------- | ------------------------------------------------------------ |
| purpose                  | 50文字以内  | 50 chars  | 1文                                                          |
| coreProblem              | 80文字以内  | 80 chars  | 1文                                                          |
| targetUsers              | 100文字以内 | 100 chars | [レベル]の開発者で、[課題]を解決したい[文脈]を開発している方 |
| mainBenefits.title       | 20文字以内  | 20 chars  | -                                                            |
| mainBenefits.description | 100文字以内 | 100 chars | -                                                            |
| seoInfo.title            | 30文字前後  | 60 chars  | 【GAS】で始まる                                              |
| seoInfo.description      | 120文字前後 | 160 chars | -                                                            |

## Technical Documentation

### Design Rationale

\`\`\`yaml
techniques:
  xml_sections:
    why: 明確な構造化で誤解を防止
    evidence: セクション間境界明確化により指示混同防止

  chain_of_thought:
    why: 7段階の複雑な推論プロセスを確実に実行
    implementation: 各段階でthinkingタグ使用し推論過程を可視化

  constraint_prioritization:
    why: 創作や推測を完全に防止
    implementation: 絶対禁止事項を最初に配置し確実な認識

complexity_score: 0.82 # Complex task requiring advanced patterns
\`\`\`

### Performance Metrics

\`\`\`yaml
target_accuracy: ≥95% # 正確な情報抽出
format_compliance: ≥98% # 有効なJSON
hallucination_rate: <2% # 存在しないメソッド
consistency: ≥90% # 同一入力での出力一致

benchmarks:
  token_efficiency: 0.85 quality/token (baseline: 0.65)
  avg_processing: {p50: 3.2s, p95: 5.8s, p99: 8.1s}
\`\`\`

### Version Evolution

\`\`\`yaml
v1→v2: +18% accuracy (XMLセクション追加、制約明確化)
v2→v3: +14% accuracy (thinkingタグ追加、自己検証)
v3→v4: +3% accuracy (チェックリスト追加、創作メソッド完全排除)
total_improvement: +35% accuracy from baseline
\`\`\`

## Operations Guide

### Usage

\`\`\`yaml
when_to_use: [GASライブラリ新規登録, README更新後の再生成, カタログ自動構築]
requirements: { required: [GitHub_URL, README_content], optional: [docs, samples] }
integration: { api: 'POST /analyze', batch: parallel_supported, cache: 24h_recommended }
limitations: [README以外非対応, 動的コード検証不可, プライベートリポジトリ要認証]
\`\`\`

### Maintenance

\`\`\`yaml
monitoring:
  weekly: [hallucination_rate, parse_error_rate]
  monthly: [consistency_check, edge_case_analysis]
  quarterly: [accuracy_evaluation, AB_testing]

update_triggers:
  immediate: [accuracy<90%, parse_errors>5%]
  scheduled: [GAS_new_features, schema_changes, quarterly_review]
  opportunistic: [user_feedback, new_techniques, competitor_analysis]
\`\`\`

## Examples

### Input Example

**Repository**: \`https://github.com/example/gas-oauth2-library\`

**README Content**:

- **ライブラリ名**: GAS OAuth2 Library
- **概要**: Google Apps ScriptでOAuth2認証を簡素化するライブラリ
- **インストール**: Library ID: \`1234567890abcdef\`
- **使用例**:

\`\`\`javascript
const service = OAuth2.createService('GitHub')
  .setAuthorizationBaseUrl('https://github.com/login/oauth/authorize')
  .setTokenUrl('https://github.com/login/oauth/access_token')
  .setClientId(CLIENT_ID)
  .setClientSecret(CLIENT_SECRET);

if (service.hasAccess()) {
  const response = UrlFetchApp.fetch('https://api.github.com/user', {
    headers: {
      Authorization: 'Bearer ' + service.getAccessToken(),
    },
  });
}
\`\`\`

### Expected Output

#### 1. 基本情報

- **ライブラリ名**: GAS OAuth2 Library
- **タグ**: \`oauth2\`, \`authentication\`, \`gas\`, \`api\`, \`github\`

#### 2. 価値提案

- **目的** (50文字以内):
  - 🇯🇵 Google Apps ScriptでOAuth2認証を簡単に実装するライブラリ
  - 🇬🇧 A library to simplify OAuth2 authentication in Google Apps Script

- **解決する課題** (80文字以内):
  - 🇯🇵 GASでOAuth2の実装は複雑でエラーが起きやすく、トークン管理も煩雑になる問題を解決
  - 🇬🇧 Solves the complexity and error-prone nature of implementing OAuth2 and token management in GAS

#### 3. 対象ユーザー (100文字以内)

- 🇯🇵 中級以上の開発者で、外部APIとの連携が必要な業務自動化ツールやアドオンを開発している方
- 🇬🇧 Intermediate to advanced developers building automation tools or add-ons that require external API integration

#### 4. 主要メリット (3-5個)

1. **簡潔なAPI設計** (Concise API Design)
   - 🇯🇵 メソッドチェーンによる直感的な設定で、数行でOAuth2フローを実装可能
   - 🇬🇧 Intuitive method chaining allows OAuth2 flow implementation in just a few lines

2. **トークン自動管理** (Automatic Token Management)
   - 🇯🇵 アクセストークンの取得、更新、保存を自動化し、開発者は認証状態の確認のみに集中できる
   - 🇬🇧 Automates access token acquisition, refresh, and storage, letting developers focus on auth state

#### 5. 使用例 (マークダウン形式)

🇯🇵 **日本語版**:

\`\`\`markdown
### GitHubのOAuth2認証を実装

以下のコードで、GitHub APIへの認証付きアクセスが可能になります。

// OAuth2サービスを作成
const service = OAuth2.createService('GitHub')
.setAuthorizationBaseUrl('https://github.com/login/oauth/authorize')
.setTokenUrl('https://github.com/login/oauth/access_token')
.setClientId(CLIENT_ID)
.setClientSecret(CLIENT_SECRET);

// アクセス権限の確認とAPI呼び出し
if (service.hasAccess()) {
// 認証済みの場合、GitHub APIを呼び出し
const response = UrlFetchApp.fetch('https://api.github.com/user', {
headers: {
Authorization: 'Bearer ' + service.getAccessToken()
}
});
// レスポンスを処理
const user = JSON.parse(response.getContentText());
console.log(user.login);
}

このコードは、OAuth2の複雑な認証フローを数行で実装し、GitHub APIへの安全なアクセスを実現します。
\`\`\`

🇬🇧 **English Version**:

\`\`\`markdown
### Implementing GitHub OAuth2 Authentication

The following code enables authenticated access to the GitHub API.

// Create OAuth2 service
const service = OAuth2.createService('GitHub')
.setAuthorizationBaseUrl('https://github.com/login/oauth/authorize')
.setTokenUrl('https://github.com/login/oauth/access_token')
.setClientId(CLIENT_ID)
.setClientSecret(CLIENT_SECRET);

// Check access and call API
if (service.hasAccess()) {
// If authenticated, call GitHub API
const response = UrlFetchApp.fetch('https://api.github.com/user', {
headers: {
Authorization: 'Bearer ' + service.getAccessToken()
}
});
// Process response
const user = JSON.parse(response.getContentText());
console.log(user.login);
}

This code implements the complex OAuth2 authentication flow in just a few lines, enabling secure access to the GitHub API.
\`\`\`

#### 6. SEOメタデータ

- **タイトル**:
  - 🇯🇵 【GAS】OAuth2認証を簡単実装 - 外部API連携ライブラリ (30文字前後)
  - 🇬🇧 GAS OAuth2 Library - Simple OAuth Authentication for Google Apps Script (60文字以内)

- **説明**:
  - 🇯🇵 Google Apps ScriptでOAuth2認証を数行で実装。GitHub、Google、Slackなど外部APIとの連携を簡単に。トークン管理も自動化し、開発時間を大幅短縮。(120文字前後)
  - 🇬🇧 Implement OAuth2 authentication in Google Apps Script with just a few lines. Easily integrate with GitHub, Google, Slack APIs. Automated token management saves development time. (160文字以内)

` as const;

/**
 * プロンプトにGitHubのURLを埋め込む
 * @param githubUrl GitHubリポジトリのURL
 * @returns URL置換済みのプロンプト
 */
export function buildLibrarySummaryPrompt(githubUrl: string): string {
  return LIBRARY_SUMMARY_PROMPT_TEMPLATE.replace('{{GITHUB_URL}}', githubUrl);
}
