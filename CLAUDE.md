# CLAUDE.md - GAS Library Hub

## §0 Identity

```yaml
name: GAS Library Hub
role: Google Apps Script ライブラリ管理プラットフォーム
mission: GASライブラリの検索・登録・AI要約を提供
tech_foundation: Svelte 5 + SvelteKit + PostgreSQL
```

* * *

## §1 Tech Stack

```yaml
framework:
  runtime: Svelte 5 + SvelteKit 2
  styling: Tailwind CSS 4 + daisyUI 5
  database: Drizzle ORM + PostgreSQL
  auth: Auth.js
  i18n: Paraglide JS

external_api:
  ai: OpenAI API（AI要約生成）
  github: GitHub API（リポジトリ情報取得）

testing:
  unit: Vitest
  e2e: Playwright
  component: Storybook
```

* * *

## §2 Svelte 5 Conventions

```yaml
runes:
  principle: リアクティブ状態管理はRunes第一選択

  ALWAYS:
    - $state(): 状態宣言
    - $derived(): 算出プロパティ
    - $effect(): 副作用
    - $props(): Props定義
    - Propsコールバック: イベント処理

  NEVER:
    - letリアクティブ宣言
    - export let（レガシー）
    - createEventDispatcher

legacy_migration:
  note: 以下は$props()への移行が必要
  files:
    - src/lib/components/Button.svelte
    - src/lib/components/SearchBox.svelte
    - src/lib/components/UserDropdown.svelte
    - src/lib/components/AdminHeader.svelte
    - src/lib/components/UserHeader.svelte

page_tests:
  rule: src/routes/ → src/stories/pages/にStorybookストーリー作成
  naming: "{PageName}.stories.svelte"
  constraint: play関数使用禁止
```

* * *

## §3 Architecture Patterns

### §3.1 Service Layer

```yaml
patterns:
  iife_as_const:
    use_when: 複雑な内部状態・ヘルパー関数が必要
    examples: [GenerateAiSummaryService, CreateLibraryService]

  class_static:
    use_when: シンプルなCRUD操作
    examples: [UpdateLibraryFromGithubService, FetchGitHubRepoDataService]

naming:
  service: 動詞 + 名詞 + Service
  crud: [Get, Post, Put, Delete] + 名詞 + Service
  list: GetAll + 名詞複数形 + Service
  conditional: Get + 名詞複数形 + By + 条件 + Service
```

**コード例（IIFE+as const）:**

```typescript
export const GenerateAiSummaryService = (() => {
  const privateHelper = () => { /* ... */ };
  return {
    call: async () => { /* 公開メソッド */ },
    callBackground: async () => { /* Fire-and-Forget */ },
  } as const;
})();
```

### §3.2 Repository Layer

```yaml
location: src/lib/server/repositories/
naming: "[Entity]Repository"
responsibility: データアクセス層の抽象化
```

### §3.3 Dependency Injection

```yaml
ALWAYS:
  - インターフェース定義: src/lib/types/
  - 本番実装: Production[Name]
  - モック実装: Mock[Name]
  - テスト時: ファクトリ経由でモック注入
```

### §3.4 SSR/Client Pattern

```yaml
server: "+page.server.ts → GetDataServerService.call()"
client: "+page.svelte → $state() + クライアントサービス呼び出し"
```

* * *

## §4 Resilience Patterns

### §4.1 Retry

```yaml
ALWAYS:
  - 外部API呼び出し（GitHub, OpenAI）にリトライ適用
  - 指数バックオフ: baseDelay * 2^attempt
  - 最大リトライ回数: 3回

implementation: src/lib/server/utils/retry-util.ts
```

### §4.2 Caching

```yaml
ALWAYS:
  - 高頻度API呼び出しにTTL付きキャッシュ適用
  - キャッシュキー: 一意識別子（owner/repo等）

example: ProductionGitHubApiClient（インメモリキャッシュ、TTL 5分）
```

### §4.3 Error Handling

```yaml
ALWAYS:
  - ServiceErrorUtil使用
  - 構造化エラーレスポンス
  - ログ出力

implementation: src/lib/server/utils/service-error-util.ts
```

### §4.4 Background Processing

```yaml
pattern: Fire-and-Forget
example: GenerateAiSummaryService.callBackground(libraryId)
behavior: レスポンス待機なし、エラーはログ出力のみ
```

### §4.5 Parallel Execution

```yaml
ALWAYS:
  - 独立した処理: Promise.all()
  - 部分失敗許容: Promise.allSettled()

NEVER:
  - 順次処理可能な場合のPromise.all（エラー時全体失敗リスク）
```

* * *

## §5 UI Conventions

### §5.1 daisyUI v5

```yaml
ALWAYS:
  - btn・card・modal・input等を第一選択
  - 不明時: Context7 MCPで公式ドキュメント調査（推測禁止）

design:
  default: Outline（btn-outline等）
  primary_action: ソリッド
  custom: daisyUI対応不可時のみTailwindクラス補完
```

### §5.2 Tailwind

```yaml
ALWAYS:
  - Svelteコンポーネント化
  - daisyUI v5設計システムで視覚一貫性
  - padding・margin調整はTailwindクラス使用

NEVER:
  - "@apply多用"
```

### §5.3 I18n

```yaml
ALWAYS:
  - UI文字列: messages/*.json で管理
  - インポート: $lib/paraglide/messages.js
  - 言語取得: getLocale()

NEVER:
  - ハードコードされた日本語/英語文字列（UI表示用）

usage: |
  import * as m from '$lib/paraglide/messages.js';
  <p>{m.welcome_message()}</p>
```

* * *

## §6 Testing & Quality

### §6.1 Test Commands

```yaml
commands:
  related: "./scripts/dev.sh related '<修正ファイルパス>'"
  all: npm run test
  storybook: npm run story
  test_runner: npm run test:storybook
```

### §6.2 Test Factory

```yaml
library: fishery
location: test/factories/
naming: "[entity].factory.ts"

ALWAYS:
  - テストデータ生成にファクトリ使用
  - 一貫したテストデータ構造
```

### §6.3 E2E Database

```yaml
config:
  test_db: gas_library_hub_test_db（本番DBと分離）
  clear_script: scripts/clear-test-data.js（テスト前自動実行）
  setup_script: scripts/setup-test-db.js

warning: |
  ⚠️ スキーマ変更時の必須作業:
  新テーブル追加時はtest/scripts/clear-test-data.jsのDELETE文も追加
  （外部キー制約順序に注意）

delete_order:
  - DELETE FROM "library_summary"
  - DELETE FROM "library"
  - DELETE FROM "user"
```

* * *

## §7 Debugging

```yaml
principle: UI/画面バグは実動作確認の再現ファーストアプローチ徹底

command: /debug-ui [対象URL]
skill: ~/.claude/skills/debugging-browser-ui/SKILL.md
fallback: 手動ブラウザ操作（Chrome DevTools MCP使用不可時）
```
