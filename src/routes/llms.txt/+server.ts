import { APP_CONFIG } from '$lib/constants/app-config.js';
import { API_CACHE_HEADERS } from '$lib/types/api-response.js';

/**
 * llms.txt エンドポイント
 * AI/LLMエージェント向けのサイト情報を提供
 * 仕様: https://llmstxt.org/
 */
export async function GET() {
  const content = `# ${APP_CONFIG.SITE_NAME}

> Google Apps Script (GAS) のライブラリとWebアプリを検索・発見できるプラットフォームです。
> AIエージェントやMCPクライアントが GAS ライブラリ情報を取得するためのAPIを提供します。

${APP_CONFIG.SITE_NAME} は、開発者が Google Apps Script のオープンソースライブラリを
効率的に発見・評価できるよう支援します。各ライブラリにはAI生成の要約、
使用例、機能説明が含まれています。

## API

### ライブラリ検索API
- エンドポイント: ${APP_CONFIG.BASE_URL}/api/libraries
- メソッド: GET
- パラメータ:
  - q: 検索キーワード
  - scriptType: library | web_app
  - tags: カンマ区切りタグ
  - minStars: 最小スター数
  - page, limit: ページネーション
  - locale: ja | en

### ライブラリ詳細API
- エンドポイント: ${APP_CONFIG.BASE_URL}/api/libraries/{id}
- メソッド: GET
- レスポンス: ライブラリの詳細情報（AI要約、使用例含む）

## Documentation

- [全ライブラリ一覧](/llms-full.txt): 全公開ライブラリのMarkdown形式

## データ構造

各ライブラリには以下の情報が含まれます:
- 基本情報: 名前、スクリプトID、GitHubリポジトリURL
- メトリクス: スター数、コピー回数
- AI要約: 目的、ターゲットユーザー、主要機能、使用例（日英対応）
- タグ: カテゴリ分類（OAuth, Spreadsheet, Gmail等）

## 使用例

### GASライブラリの検索
\`\`\`bash
curl "${APP_CONFIG.BASE_URL}/api/libraries?q=OAuth&scriptType=library&limit=5"
\`\`\`

### 特定ライブラリの詳細取得
\`\`\`bash
curl "${APP_CONFIG.BASE_URL}/api/libraries/{library_id}"
\`\`\`

## Contact

- Website: ${APP_CONFIG.BASE_URL}
`;

  return new Response(content.trim(), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      ...API_CACHE_HEADERS.LONG,
    },
  });
}
