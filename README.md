# GAS Library Hub

## 📖 サイト概要

**[GAS Library Hub](https://appscripthub.com/)** は、Google Apps Script（GAS）の優れたライブラリを発見・共有するためのプラットフォームです。開発者が必要なGASライブラリを効率的に見つけ、プロジェクトに活用できるようサポートします。

🌐 **公式サイト**: <https://appscripthub.com/>

### 🎯 主な機能

- **ライブラリ検索**: タグやキーワードでGASライブラリを簡単検索
- **詳細情報**: AI生成の要約、使用例、作者情報を表示
- **ライブラリ申請**: 新しいライブラリの登録申請

### 🌟 特徴

- **AI要約**: ライブラリの自動要約生成
- **GitHub連携**: リポジトリ情報の自動取得とStar数表示
- **タグ検索**: タグをクリックして関連ライブラリをすぐに検索

### 🚀 対象ユーザー

- GAS開発者
- GASライブラリ作者

---

## 🤖 MCP Integration (For LLMs)

GAS Library Hub は [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) に対応しています。
Claude Desktop、Cursor、その他のMCPクライアントから直接GASライブラリを検索・取得できます。

### Endpoint

- **URL**: `https://appscripthub.com/api/mcp`
- **Transport**: HTTP (JSON-RPC 2.0)
- **Documentation**: <https://appscripthub.com/llms.txt>

### Available Tools

| Tool                  | Description                                    |
| --------------------- | ---------------------------------------------- |
| `search_libraries`    | GASライブラリをキーワード・タグ・Star数で検索  |
| `get_library_details` | ライブラリ詳細情報を取得（AI要約・使用例含む） |

### Configuration

**Claude Desktop** (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "gas-library-hub": {
      "url": "https://appscripthub.com/api/mcp"
    }
  }
}
```

**Cursor** (`.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "gas-library-hub": {
      "url": "https://appscripthub.com/api/mcp"
    }
  }
}
```

---

## 📧 お問い合わせ

- **お問い合わせフォーム**: <https://wywy.jp/contact>
- **GitHub Issues**: [Issues](https://github.com/wywy-llc/app-script-hub/issues)
