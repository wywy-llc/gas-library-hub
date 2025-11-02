# CLAUDE.md - Svelte 5

> **グローバル規約**: `~/.claude/CLAUDE.md`のMCP Autonomous Agent規約に準拠
> **ワークフロー**: `~/.claude/specifications/workflow/workflow-guide.md`参照

## Svelte 5 + SvelteKit規約

### Runes徹底活用

```yaml
絶対原則: リアクティブ状態管理はRunes第一選択
状態宣言: { 使用: $state, 禁止: letリアクティブ宣言 }
算出プロパティ: { 使用: $derived }
副作用: { 使用: $effect }
Props: { 使用: $props, 禁止: export let }
イベント: { 推奨: Propsコールバック, 非推奨: createEventDispatcher }
```

### ページテスト配置

```yaml
原則: src/routes/ → src/stories/pages/にStorybookストーリー作成
命名: '{PageName}.stories.svelte'
例: src/routes/double-check/+page.svelte → src/stories/pages/DoubleCheckPage.stories.svelte
制約: play関数使用禁止
```

## E2Eデータベース管理

**自動管理**:

- テストDB: `gas_library_hub_test_db`（本番DBと分離）
- データクリア: `scripts/clear-test-data.js`（テスト前自動実行）
- スキーマ作成: `scripts/setup-test-db.js`

**⚠️ スキーマ変更時の必須作業**:
新テーブル追加時は`test/scripts/clear-test-data.js`のDELETE文も追加（外部キー制約順序に注意）

```javascript
// 現在の削除順序（外部キー制約を考慮）
await db.execute(sql`DELETE FROM "library_summary"`);
await db.execute(sql`DELETE FROM "library"`);
await db.execute(sql`DELETE FROM "user"`);
```

## サービス層規約

### オブジェクトリテラルパターン

**絶対原則**: IIFE+as constパターン徹底。クラス静的メソッド禁止。

```typescript
export const ProcessQuotePdfService = (() => {
  const privateHelper = () => {
    /* ... */
  };
  return {
    call: () => {
      /* 公開メソッド */
    },
  } as const;
})();
```

### SSR+クライアント更新パターン

```typescript
// +page.server.ts
export const load: PageServerLoad = async () => {
  const data = await GetDataServerService.call(); // SSR
  return { data };
};

// +page.svelte
let { data } = $props();
let items = $state(data.items);
const handleUpdate = async () => {
  items = await GetDataService.call(); // クライアント
};
```

### 命名規則

```yaml
パターン: 動詞+名詞+Service
データ取得系:
  単体: [GetCommentService, PostCommentService, PutCommentService, DeleteCommentService]
  一覧: GetAllCommentsService
  条件付: [GetCommentsByUserService, GetProductsByCategoryService]
```

---

## スタイリング規約

### daisyUI v5

```yaml
絶対原則: btn・card・modal・input等を第一選択
Usage調査: 不明時はContext7 MCPで公式ドキュメント調査（推測禁止）
デザイン方針: Outline基本（btn-outline等）、Primary actionのみソリッド
カスタム: daisyUI対応不可時のみTailwindクラス補完
例外: padding・margin調整はTailwindクラス推奨
```

### Tailwind CSS

```yaml
禁止: '@apply多用'
推奨: Svelteコンポーネント化
一貫性: プロジェクト全体でdaisyUI v5設計システム視覚一貫性
```

### テストコマンド

```yaml
関連テスト: ./scripts/dev.sh related '<修正ファイルパス>'
全体テスト: npm run test
Storybook起動: npm run story
Test Runner: npm run test:storybook
```

---

## デバッグ規約

**絶対原則**: UI/画面バグは実動作確認の再現ファーストアプローチ徹底。

### デバッグツール選択

```yaml
第一選択: /debug-ui（Chrome DevTools MCP統合）
対象:
  - UI要素動作異常
  - データ不整合表示問題
  - イベントハンドラー不具合
  - レスポンシブデザイン崩れ
第二選択: 手動ブラウザ操作（Chrome DevTools MCP使用不可時）
```

### デバッグ実行フロー

```yaml
基本コマンド: /debug-ui [対象URL]
詳細: .claude/commands/debug-ui.md参照

手順概要: 1. サーバー起動確認（http://localhost:5173）
  2. データ整合性確認（src/lib/data/テストデータ）
  3. バグ再現（Chrome DevTools MCP自動操作）
  4. インタラクティブデバッグ（AI提案に基づき段階的調査）
  5. 根本原因特定
  6. 修正実装
  7. 自動検証（--verifyオプション）
  8. 全体テスト（npm run test）
```
