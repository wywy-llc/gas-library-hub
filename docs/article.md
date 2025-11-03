# 【個人開発】GASライブラリを誰もが簡単に検索・共有・評価できるプラットフォーム「GAS Library Hub」をGASのUdemy講師が作ってみた

## はじめに

Google Apps Script（GAS）を使った業務自動化が当たり前になった現在、「あの機能を実装するのに便利なライブラリはないかな？」と思うことはありませんか？

GitHubで検索しても、有用なGASライブラリを見つけるのは意外と大変。README を読んでもスクリプトIDが見つからない、使い方がよくわからない...そんな課題を解決するために **「GAS Library Hub」** を開発しました。

🔗 **[GAS Library Hub](https://appscripthub.com/user)** - 本番サイト  
🔗 **[GitHub リポジトリ](https://github.com/wywy-llc/app-script-hub)** - ソースコード

![GAS Library Hub スクリーンショット](https://appscripthub.com/logo.png)

本記事では、Udemy講師として普段GASを教えている私が、なぜこのプラットフォームを作ったのか、そしてどのような技術で実装したのかをソースコード付きで詳しく解説します。

## なぜ作ったのか？

### GASライブラリ探しの課題

GAS開発でよくある悩み：

- **ライブラリが見つからない**: GitHubで「apps script」で検索しても膨大すぎる
- **スクリプトIDが不明**: READMEにスクリプトIDが書いてない、探すのが大変
- **品質がバラバラ**: 動くかどうか、メンテナンスされているかわからない
- **機能が不明**: READMEを読んでも何ができるのかピンとこない

### GAS Library Hubで解決すること

✅ **AI要約で機能を瞬時に把握**：OpenAI APIでライブラリの目的・機能を自動要約  
✅ **スクリプトIDをワンクリックコピー**：69パターンの正規表現でREADMEから自動抽出  
✅ **品質管理された信頼できるライブラリ**：管理者承認制で厳選されたライブラリのみ  
✅ **Webアプリにも対応**：ライブラリだけでなくGAS Webアプリも検索可能

## 技術スタック

モダンなフルスタック構成で、開発効率と品質を両立しました。

### フロントエンド

- **SvelteKit 2.x + Svelte 5** - 最新のリアクティブフレームワーク
- **Tailwind CSS v4** - 次世代ユーティリティファースト
- **Paraglide JS** - 型安全な国際化（日本語・英語対応）
- **MDSvex** - Markdownサポート

### バックエンド

- **PostgreSQL + Drizzle ORM** - 型安全なデータベース操作
- **Auth.js** - Google OAuth認証
- **OpenAI API** - AI要約生成
- **GitHub API** - リポジトリ情報取得

### 開発・テスト

- **TypeScript** - 完全型安全
- **Vitest** - 高速ユニットテスト
- **Playwright** - E2Eテスト
- **Storybook** - コンポーネント駆動開発

### インフラ

- **Vercel** - サーバーレスデプロイ
- **Neon** - PostgreSQL（本番）

## 核心技術の深掘り

このプラットフォームの価値を支える2つの技術的な柱である「AI要約生成システム」と「スクリプトID抽出エンジン」について、実装の詳細を紹介します。

## 1. 69パターンの正規表現によるスクリプトID抽出エンジン

### なぜ正規表現が69パターンも必要なのか？

GitHub上のGASライブラリのREADMEでは、開発者によってスクリプトIDの記載方法が千差万別です。実際の調査で発見した記載パターンを見てみましょう：

````markdown
<!-- パターン1: 明示的なラベル付き -->

Library's project key: 1B7FSrk5Zi6L1rSxxTDgDEUsPzlukDsi4KGuTMorsTQHhGBzBkMun4iDF

<!-- パターン2: JSON設定ファイル内 -->

{
"libraryId": "1nUiajCHQReVwWPq7rNAvsIcWvPptmMUSzeytnzVHDpdoxUIvuX0e_reL"
}

<!-- パターン3: URL形式 -->

https://script.google.com/macros/d/1B7FSrk5Zi6L1rSxxTDgDEUsPzlukDsi4KGuTMorsTQHhGBzBkMun4iDF/edit

<!-- パターン4: インストール手順内 -->

Apps Script エディタで「ライブラリ」→「ライブラリを追加」
スクリプトID: `1nUiajCHQReVwWPq7rNAvsIcWvPptmMUSzeytnzVHDpdoxUIvuX0e_reL`

<!-- パターン5: コードブロック内 -->

```javascript
const LIBRARY_ID = '1B7FSrk5Zi6L1rSxxTDgDEUsPzlukDsi4KGuTMorsTQHhGBzBkMun4iDF';
```
````

````

### 優先度ベースの段階的マッチング戦略

抽出精度を最大化するため、パターンを精度の高い順に適用しています：

```typescript
// 最高精度: ライブラリキー明示記載
/(?:library["']?s?\s*project\s*key|ライブラリ.*?キー)[^:]*[:：]?\s*```?\s*(1[A-Za-z0-9_-]{24,69})\s*```?/gi

// 高精度: コードブロック内（文字数制限で誤検出を防止）
/```[^`]*?(1[A-Za-z0-9_-]{57,69})[^`]*?```/gs

// 高精度: Google Script URL形式
/https:\/\/script\.google\.com\/macros\/d\/([A-Za-z0-9_-]{25,70})\/edit/gi

// 中精度: スクリプトID明示
/(?:スクリプト|script)\s*(?:id|ID)[：:\s=]*['"`]?([A-Za-z0-9_-]{25,70})['"`]?/gi

// 低精度: 一般的な1で始まる文字列（最後の手段）
/\b(1[A-Za-z0-9_-]{24,69})\b/g
````

### 誤抽出防止の除外パターンシステム

単純にマッチングするだけでは、以下のような文字列を誤って抽出してしまいます：

```typescript
// 画像ファイルURL
'103873116-2dd87e00-5084-11eb-8ab6-d4c1b7be8ec6.png';

// AWSキー・シークレット
"aws_secret_key = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890'";

// UUID形式
'1a2b3c4d-5e6f-7890-abcd-ef1234567890';
```

これらを除外するための洗練されたフィルタシステム：

```typescript
const exclusionPatterns = [
  // 画像ファイル拡張子
  /1[A-Za-z0-9_-]{24,69}\.(png|jpg|jpeg|gif|webp|svg)/gi,

  // AWSキー・シークレット
  /(?:access_?key|secret_?key|aws_?access)[^:]*[:=]\s*['"`]?[A-Za-z0-9_-]{20,}['"`]?/gi,

  // UUID形式
  /1[a-f0-9]{7}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi,

  // JSON特定フィールド
  /["'](?:email_id|session_id|api_key|user_id)["']\s*:\s*["'][A-Za-z0-9_-]+["']/gi,
];
```

### 実装の核心部分

```typescript
export class GASScriptIdExtractor {
  public static extractScriptId(content: string): string | undefined {
    // 優先度順にパターンを適用
    for (const pattern of DEFAULT_SCRIPT_ID_PATTERNS) {
      pattern.lastIndex = 0; // グローバル正規表現をリセット
      const matches = content.matchAll(pattern);

      for (const match of matches) {
        const candidateId = match[1] || '';

        // 最小文字数チェック
        if (candidateId.length >= 20) {
          // 除外パターンチェック
          if (!this.shouldExcludeCandidate(candidateId, content)) {
            return candidateId; // 最初にマッチした有効なIDを返却
          }
        }
      }
    }
    return undefined;
  }
}
```

## 2. OpenAI API による高品質な多言語要約生成

### 7段階の思考プロセスによる構造化要約

単純にREADMEを要約するのではなく、GASライブラリ専門家としての視点で7段階の思考プロセスを経て要約を生成します：

```typescript
const SYSTEM_PROMPT = `
あなたはGoogle Apps Script (GAS) ライブラリの価値を開発者視点で見抜く専門家です。

思考プロセス：
1. High-Level Analysis: READMEの全体構造を把握
2. Core Value Proposition: ライブラリの核心価値を特定
3. Target User Profile: 対象ユーザー像を解像度高く定義
4. Key Benefits: 開発者にとっての具体的メリットを抽出
5. Tiered Code Examples: 段階的なコード例を作成
6. SEO Metadata Generation: 検索最適化データを生成
7. Finalization: 一貫性チェックと最終出力

厳格なルール：
- 検証可能な情報のみ使用（推測・創作・誇張禁止）
- 存在しない機能は絶対に記述しない
- 主観的評価を排除（「素晴らしい」「革新的な」等禁止）
`;
```

### JSON Schemaによる厳密な出力制御

OpenAI API に対して厳密なスキーマを定義し、一貫した構造のデータを生成します：

```typescript
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
              ja: { type: 'string', description: '日本語ライブラリ名（20文字以内）' },
              en: { type: 'string', description: '英語ライブラリ名（20語以内）' },
            },
            required: ['ja', 'en'],
          },
          purpose: {
            type: 'object',
            properties: {
              ja: { type: 'string', description: '日本語での目的説明（100文字以内）' },
              en: { type: 'string', description: '英語での目的説明（100語以内）' },
            },
            required: ['ja', 'en'],
          },
        },
        required: ['libraryName', 'purpose'],
      },
    },
    required: ['basicInfo'],
    additionalProperties: false, // 追加プロパティを禁止
  },
};
```

### 多言語対応の実装戦略

完全な日英同期で構造化データを生成し、データベース保存時にフラット化します：

```typescript
// 生成された多言語構造データ
const summary = {
  basicInfo: {
    libraryName: { ja: 'OAuth2認証ライブラリ', en: 'OAuth2 Authentication Library' },
    purpose: { ja: 'GASでOAuth2認証を簡単に実装', en: 'Easy OAuth2 auth for GAS' },
  },
};

// データベース保存用にフラット化
const flattenedData = {
  libraryNameJa: summary.basicInfo.libraryName.ja,
  libraryNameEn: summary.basicInfo.libraryName.en,
  purposeJa: summary.basicInfo.purpose.ja,
  purposeEn: summary.basicInfo.purpose.en,
};
```

### コスト最適化とエラーハンドリング

E2Eテスト環境でのAPI呼び出しコストを削減しつつ、robust なエラーハンドリングを実装：

```typescript
export class GenerateLibrarySummaryService {
  public static async call(params: { githubUrl: string; skipOnError?: boolean }) {
    // E2Eテスト環境ではモックデータを使用（コスト削減）
    if (process.env.PLAYWRIGHT_TEST_MODE === 'true') {
      console.log('🤖 [E2E Mock] AI要約を生成中... (モックデータを使用)');
      await new Promise(resolve => setTimeout(resolve, 100)); // レスポンス時間をシミュレート
      return getE2EMockSummary(params.githubUrl);
    }

    try {
      // README取得
      const readme = await GitHubApiUtils.fetchReadme(owner, repo);

      // OpenAI API呼び出し
      const response = await openai.chat.completions.create({
        model: 'gpt-5', // 最新のo3モデル使用
        reasoning_effort: {'medium'},
        response_format: {
          type: 'json_schema',
          json_schema: LIBRARY_SUMMARY_JSON_SCHEMA,
        },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: buildOptimizedPrompt(githubUrl, readme) },
        ],
      });

      // JSON解析とバリデーション
      const content = response.choices[0]?.message?.content;
      if (!content) throw new Error('OpenAI API からの応答が空です');

      return JSON.parse(content) as LibrarySummary;
    } catch (error) {
      if (params.skipOnError) {
        console.warn('AI要約生成をスキップ:', error);
        return; // メイン処理は続行
      }
      throw error;
    }
  }
}
```

### 実際の生成例

OAuth認証ライブラリの要約生成結果：

```json
{
  "basicInfo": {
    "libraryName": {
      "ja": "OAuth2認証ライブラリ",
      "en": "OAuth2 Authentication Library"
    },
    "purpose": {
      "ja": "Google Apps ScriptでOAuth2認証を簡単に実装するためのライブラリ",
      "en": "Library for easy OAuth2 authentication implementation in Google Apps Script"
    }
  },
  "functionality": {
    "coreProblem": {
      "ja": "Google Apps ScriptでのOAuth2認証実装の複雑さ",
      "en": "Complexity of OAuth2 authentication implementation in Google Apps Script"
    },
    "usageExample": {
      "ja": "// OAuth2認証の実装\nconst auth = new OAuth2Service();\nauth.authorize('google', 'your-client-id', 'your-client-secret');"
    }
  }
}
```

## 技術的インパクト

この2つのシステムにより、従来は手動で30分〜1時間かかっていたライブラリの調査・理解作業が、**約10秒で完了**するようになりました。

**正規表現エンジン**：69パターンの段階的マッチングにより、95%以上の精度でスクリプトIDを自動抽出  
**AI要約システム**：7段階の思考プロセスと厳密なスキーマ制御により、人間が読むのと同等レベルの理解を自動化

## その他の技術的特徴

### 並行処理最適化されたスクレイピング

GitHub APIとの効率的な連携で、ライブラリ情報を高速に収集します：

```typescript
// 複数のAPI呼び出しを並行実行
const [repoInfo, readmeContent, gsFiles] = await Promise.all([
  GitHubApiClient.fetchRepositoryInfo(params.githubUrl),
  GitHubApiClient.fetchReadme(params.githubUrl),
  GitHubApiClient.fetchGsFiles(params.githubUrl),
]);
```

### 型安全な多言語対応

Paraglide JSによる完全な型安全性を確保した国際化システム：

```svelte
<script lang="ts">
  import { getLocale } from '$lib/paraglide/runtime.js';
  import { meta_title_home } from '$lib/paraglide/messages.js';

  let currentLocale = $derived(getLocale());
</script>

<title>{meta_title_home()}</title>
```

## 苦労したポイント

### 1. GASスクリプトIDの多様な記載形式

READMEでのスクリプトIDの記載方法は開発者によって千差万別でした。これらすべてに対応するため、69パターンの正規表現を作成し、さらにAWSキーなどの誤抽出を防ぐ除外フィルタも実装しました。

### 2. OpenAI APIの出力安定化

AI要約の品質と形式を安定させるために、詳細なプロンプトエンジニアリングを行いました。特に「推測・創作・誇張禁止」というルールを厳格に設定し、事実に基づいた要約のみを生成するよう調整しました。

## まとめ

GAS Library Hubの開発を通じて、**正規表現エンジニアリング**と**AI要約システム**という2つの技術的挑戦に取り組みました。

**技術的な学び：**

- 69パターンの正規表現による高精度データ抽出の実現
- 7段階思考プロセスによるAI要約の品質向上
- JSON Schemaを活用した構造化データ制御
- E2Eテスト環境でのコスト最適化手法

**開発で重視したポイント：**

- 実データに基づく精度重視の設計
- 多言語対応による国際的な利用価値
- エラーハンドリングによる堅牢性
- パフォーマンス最適化による快適な UX

従来手動で30分〜1時間かかっていたライブラリ調査が10秒で完了するようになり、GAS開発者の生産性向上に貢献できたと考えています。

🔗 **[GAS Library Hub](https://appscripthub.com/user)** - ぜひ使ってみてください！  
🔗 **[GitHub](https://github.com/wywy-llc/app-script-hub)** - ソースコードも公開中

---

### 関連リンク

- [SvelteKit 公式ドキュメント](https://kit.svelte.dev/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [Paraglide JS](https://inlang.com/m/gerre34r/library-inlang-paraglideJs)
- [wywy合同会社](https://wywy.jp/)

### タグ

# GoogleAppsScript #GAS #SvelteKit #TypeScript #個人開発 #PostgreSQL #OpenAI #Vercel #正規表現 #AI要約
