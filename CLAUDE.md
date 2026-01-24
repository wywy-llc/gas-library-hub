# CLAUDE.md - GAS Library Hub

## §0 Identity

```yaml
name: GAS Library Hub
role: Google Apps Script ライブラリ管理プラットフォーム
mission: GASライブラリの検索・登録・AI要約を提供
tech_foundation: Svelte 5 + SvelteKit + PostgreSQL
```

---

## §1 Tech Stack

```yaml
framework:
  runtime: Svelte 5 + SvelteKit 2
  styling: Tailwind CSS 4 + daisyUI 5
  database: Drizzle ORM + PostgreSQL
  auth: Auth.js
  i18n: Paraglide JS

external_api:
  ai: OpenAI API
  github: GitHub API

testing:
  unit: Vitest
  e2e: Playwright
  component: Storybook
```

---

## §2 Core Constraints

```yaml
# ── Architecture ──
ALWAYS:
  - インターフェース定義: src/lib/types/
  - 本番実装: Production[Name]
  - モック実装: Mock[Name]
  - テスト時: ファクトリ経由でモック注入

# ── Resilience ──
ALWAYS:
  - 外部API呼び出し（GitHub, OpenAI）にリトライ適用
  - 指数バックオフ: baseDelay × 2^attempt（最大3回）
  - 高頻度API呼び出しにTTL付きキャッシュ適用
  - ServiceErrorUtilで構造化エラーレスポンス
  - 独立処理: Promise.all() / 部分失敗許容: Promise.allSettled()

NEVER:
  - 順次処理可能な場合のPromise.all（全体失敗リスク）
```

---

## §3 Svelte 5 Rules

```yaml
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
```

---

## §4 Architecture Patterns

### §4.1 Service Layer

```yaml
patterns:
  iife_as_const:
    use_when: 複雑な内部状態・ヘルパー関数が必要
    examples: [GenerateAiSummaryService, CreateLibraryService]

  class_static:
    use_when: シンプルなCRUD操作
    examples: [UpdateLibraryFromGithubService, FetchGitHubRepoDataService]

naming:
  pattern: "{Verb}{Noun}Service"
  crud: [Get, Post, Put, Delete]{Noun}Service
  list: GetAll{Nouns}Service
  conditional: Get{Nouns}By{Condition}Service
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

### §4.2 Repository Layer

```yaml
location: src/lib/server/repositories/
naming: "{Entity}Repository"
```

### §4.3 SSR/Client Pattern

```yaml
server: "+page.server.ts → GetDataServerService.call()"
client: "+page.svelte → $state() + クライアントサービス呼び出し"
```

### §4.4 Background Processing

```yaml
pattern: Fire-and-Forget
example: GenerateAiSummaryService.callBackground(libraryId)
behavior: レスポンス待機なし、エラーはログ出力のみ
```

---

## §5 UI & I18n

### §5.1 Constraints

```yaml
ALWAYS:
  - daisyUI v5コンポーネント（btn, card, modal, input）を第一選択
  - UI文字列: messages/*.json で管理
  - 不明時: Context7 MCPで公式ドキュメント調査

NEVER:
  - "@apply"多用
  - ハードコードされた日本語/英語文字列（UI表示用）
```

### §5.2 daisyUI v5

```yaml
design:
  default: Outline（btn-outline等）
  primary_action: ソリッド
  custom: daisyUI対応不可時のみTailwindクラス補完
```

### §5.3 I18n（Paraglide）

```yaml
import: $lib/paraglide/messages.js
locale: getLocale()

usage: |
  import * as m from '$lib/paraglide/messages.js';
  <p>{m.welcome_message()}</p>
```

---

## §6 Testing & Quality

### §6.1 Constraints

```yaml
ALWAYS:
  - テストデータ生成にファクトリ使用（fishery）
  - src/routes/ → src/stories/pages/ にStorybookストーリー作成

NEVER:
  - Storybookでplay関数使用
```

### §6.2 Test Factory

```yaml
library: fishery
location: test/factories/
naming: "{entity}.factory.ts"
```

### §6.3 E2Eテスト

```yaml
command: npm run test:e2e
script: test/scripts/run-e2e-tests.js

workflow:
  1_setup: PlaywrightのglobalSetupでDB初期化
  2_test: Playwrightテスト実行
  3_cleanup: テストDB自動クリーンアップ

prerequisites:
  GITHUB_TOKEN: .envに設定必須（public_repoスコープ）

related_scripts:
  setup: npm run test:e2e:setup
  cleanup: npm run test:e2e:cleanup
```

### §6.4 E2E Database

```yaml
config:
  test_db: gas_library_hub_test_db
  clear_script: scripts/clear-test-data.js
  setup_script: scripts/setup-test-db.js

warning: |
  ⚠️ スキーマ変更時: 新テーブル追加時は clear-test-data.js のDELETE文も追加
  （外部キー制約順序に注意）

delete_order: [library_summary, library, user]
```

---

## §7 Debugging

```yaml
principle: UI/画面バグは実動作確認の再現ファーストアプローチ

command: /debug-ui [対象URL]
skill: ~/.claude/skills/debugging-browser-ui/SKILL.md
fallback: 手動ブラウザ操作（Chrome DevTools MCP使用不可時）
```

---

## §8 Development Workflow

### §8.1 dev.sh コマンド

```yaml
script: ./scripts/dev.sh
version: v3.0

commands:
  test: "./scripts/dev.sh test '<ファイルパス or パターン>'"
  test_fast: "./scripts/dev.sh test:fast"
  check: "./scripts/dev.sh check"
  fix: "./scripts/dev.sh fix [path]"

npm_commands:
  test: npm run test              # ユニットテスト実行
  test_e2e: npm run test:e2e      # E2Eテスト実行
  test_storybook: npm run test:storybook  # Storybookテスト実行
  story: npm run story            # Storybook開発サーバー起動

options:
  --verbose: 詳細ログ表示（VITEST_CONSOLE_LOG連携）

features:
  auto_resolve: ソースファイル → テストファイル自動推論
  pattern_search: パターンでテストファイル検索
  storybook_detect: .svelteファイル → Storybookストーリー検出
```

**使用例:**

```bash
# ソースファイルから関連テスト検出・実行
./scripts/dev.sh test src/lib/services/foo-service.ts

# テストファイル直接実行
./scripts/dev.sh test test/lib/services/foo.test.ts

# パターンでテスト検索
./scripts/dev.sh test foo-service

# 高速テスト（型チェック・lintスキップ）
./scripts/dev.sh test:fast --verbose

# 自動修正
./scripts/dev.sh fix src/lib/components/Button.svelte
```

### §8.2 Claude Code Hooks

```yaml
config: .claude/settings.json

hooks:
  PostToolUse:
    trigger: Edit | Write | MultiEdit
    action: "./docker/dev.sh fix"
    purpose: ファイル編集後に自動フォーマット・lint修正

  Stop:
    trigger: Edit | Write | MultiEdit
    action: "./docker/dev.sh check"
    purpose: セッション終了前に型チェック実行
```

---

## §9 Reference Paths

```yaml
services: src/lib/server/services/
repositories: src/lib/server/repositories/
types: src/lib/types/
utils:
  retry: src/lib/server/utils/retry-util.ts
  error: src/lib/server/utils/service-error-util.ts
factories: test/factories/
scripts: scripts/dev.sh
claude_config: .claude/settings.json
```
