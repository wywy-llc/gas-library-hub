# GAS Library Hub

## 📖 サイト概要

**[GAS Library Hub](https://appscripthub.com/)** は、Google Apps Script（GAS）の優れたライブラリを発見・共有するためのプラットフォームです。開発者が必要なGASライブラリを効率的に見つけ、プロジェクトに活用できるようサポートします。

🌐 **公式サイト**: <https://appscripthub.com/>

### 🎯 主な機能

- **ライブラリ検索**: タグやキーワードでGASライブラリを簡単検索
- **詳細情報**: AI生成の要約、使用例、作者情報を表示
- **ライブラリ申請**: 新しいライブラリの登録申請

### 🌟 特徴

- **AI要約**: OpenAI APIによるライブラリの自動要約生成
- **GitHub連携**: リポジトリ情報の自動取得とStar数表示
- **高速**: SvelteKit + Tailwind CSSによる最適化されたパフォーマンス

### 🚀 対象ユーザー

- GAS開発者
- GASライブラリ作者

---

## 🛠 開発環境セットアップ

### インストールと起動

```bash
# リポジトリのクローン
git clone https://github.com/wywy-llc/app-script-hub.git
cd app-script-hub

# 依存関係のインストール
npm install

# 環境変数の設定
cp .env.example .env
# .envファイルを編集してデータベース接続情報等を設定

# データベースのセットアップ
npm run db:push

# 開発サーバーの起動
npm run dev

# ブラウザで自動的に開く場合
npm run dev -- --open
```

開発サーバーは <http://localhost:5173> で起動します。

### 主要コマンド

```bash
# 開発サーバー起動
npm run dev

# 本番ビルド
npm run build

# プレビュー
npm run preview

# 全テスト実行（必須）
npm run test

# データベーススキーマ更新
npm run db:push

# Drizzle Studio起動
npm run db:studio
```

## 🧪 テスト

### 必須: テスト実行

**すべてのコード変更後に必ず実行してください:**

```bash
npm run test
```

このコマンドは以下を順次実行します:

1. `npm run lint` - コードフォーマット & ESLint
2. `npm run check` - TypeScript型チェック
3. `npm run test:unit -- --run` - ユニットテスト
4. `npm run test:e2e` - E2Eテスト

### 個別テスト実行

```bash
# ユニットテストのみ
npm run test:unit

# E2Eテストのみ
npm run test:e2e

# Storybook起動
npm run storybook
```

### データベーススキーマ変更時の注意

新しいテーブルを追加する際は、テストデータクリーンアップスクリプトの更新が必要です:

1. `src/lib/server/db/schema.ts` にテーブル定義を追加
2. `test/scripts/clear-test-data.js` にDELETE文を追加

```javascript
// 外部キー制約の順序を考慮した削除順序
await db.execute(sql`DELETE FROM "new_table"`);
await db.execute(sql`DELETE FROM "library_summary"`);
await db.execute(sql`DELETE FROM "library"`);
await db.execute(sql`DELETE FROM "user"`);
```

**重要**: 外部キー制約がある場合は削除順序に注意してください。子テーブルを先に削除する必要があります。

## 🏗 技術スタック

### フロントエンド

- **フレームワーク**: SvelteKit 2.x + Svelte 5
- **スタイリング**: Tailwind CSS v4
- **国際化**: Paraglide JS（日本語・英語）
- **Markdown**: MDSvex

### バックエンド

- **データベース**: PostgreSQL + Drizzle ORM
- **認証**: Auth.js + Google OAuth
- **外部API**: OpenAI API、GitHub API

### 開発・テスト

- **テスト**: Vitest（ユニット）+ Playwright（E2E）+ Storybook
- **品質管理**: TypeScript + ESLint + Prettier
- **ビルド**: Vite

### インフラ

- **デプロイ**: Vercel
- **データベース**: Neon（本番）

## 📁 プロジェクト構成

```text
src/
├── lib/
│   ├── constants/          # 定数定義
│   ├── paraglide/         # 国際化ファイル
│   └── server/            # サーバーサイドコード
│       ├── db/schema.ts   # データベーススキーマ
│       ├── auth.ts        # 認証設定
│       └── services/      # ビジネスロジック
├── routes/                # SvelteKitルーティング
│   ├── admin/            # 管理機能
│   ├── auth/             # 認証関連
│   └── user/             # ユーザー機能
└── stories/              # Storybookコンポーネント

test/
├── e2e/                  # E2Eテスト
├── factories/            # テストデータファクトリ
└── scripts/              # データベース管理スクリプト
```

### 開発ルール

- **必須**: すべてのPRで `npm run test` が成功すること
- TypeScript の型安全性を保持
- マジックナンバー・文字列リテラルの定数化
- コンポーネントのStorybook対応

## 📧 お問い合わせ

- **お問い合わせフォーム**: <https://wywy.jp/contact>
- **GitHub Issues**: [Issues](https://github.com/wywy-llc/app-script-hub/issues)
