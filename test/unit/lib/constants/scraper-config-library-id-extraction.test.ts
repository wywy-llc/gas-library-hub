import { describe, expect, it } from 'vitest';
import { containsExpectedId, extractAllMatches } from './scraper-pattern-test-helper.js';

describe('GeminiWithFiles ライブラリID抽出テスト', () => {
  it('GeminiWithFilesのREADMEからライブラリIDが正しく抽出される', () => {
    // 実際のGeminiWithFilesのREADME内容（ライブラリIDの記載部分）
    const geminiWithFilesReadme = `# GeminiWithFiles

A Google Apps Script library for Gemini API with files.

## Usage

In order to test this script, please do the following steps.

### 2. Use GeminiWithFiles as a Google Apps Script library

If you use this library as a Google Apps Script library, please install the library to your Google Apps Script project as follows.

1. Create a Google Apps Script project. Or, open your Google Apps Script project.

   - You can use this library for the Google Apps Script project of both the standalone and container-bound script types.

2. [Install this library](https://developers.google.com/apps-script/guides/libraries).

   - The library's project key is as follows.

\`\`\`
1dolXnIeXKz-BH1BlwRDaKhzC2smJcGyVxMxGYhaY2kqiLa857odLXrIC
\`\`\`

### 3. Use GeminiWithFiles in your own Google Apps Script project

If you use this library in your own Google Apps Script project, please copy and paste the script.`;

    // 期待されるライブラリIDが抽出されているかを確認
    const expectedLibraryId = '1dolXnIeXKz-BH1BlwRDaKhzC2smJcGyVxMxGYhaY2kqiLa857odLXrIC';
    const hasExpectedId = containsExpectedId(geminiWithFilesReadme, expectedLibraryId);

    // 期待されるIDが必ず抽出されることを検証
    expect(hasExpectedId).toBe(true);
  });

  const testCases = [
    {
      name: 'コードブロック内のライブラリID',
      content: `\`\`\`
1dolXnIeXKz-BH1BlwRDaKhzC2smJcGyVxMxGYhaY2kqiLa857odLXrIC
\`\`\``,
      expectedId: '1dolXnIeXKz-BH1BlwRDaKhzC2smJcGyVxMxGYhaY2kqiLa857odLXrIC',
    },
    {
      name: "The library's project key is as follows.の後のID",
      content: `The library's project key is as follows.

1dolXnIeXKz-BH1BlwRDaKhzC2smJcGyVxMxGYhaY2kqiLa857odLXrIC`,
      expectedId: '1dolXnIeXKz-BH1BlwRDaKhzC2smJcGyVxMxGYhaY2kqiLa857odLXrIC',
    },
    {
      name: 'ライブラリインストール手順内のID',
      content: `2. Install this library

   - The library's project key is as follows.

\`\`\`
1dolXnIeXKz-BH1BlwRDaKhzC2smJcGyVxMxGYhaY2kqiLa857odLXrIC
\`\`\``,
      expectedId: '1dolXnIeXKz-BH1BlwRDaKhzC2smJcGyVxMxGYhaY2kqiLa857odLXrIC',
    },
    {
      name: 'スクリプトIDラベル付き',
      content: `スクリプトID: 1dolXnIeXKz-BH1BlwRDaKhzC2smJcGyVxMxGYhaY2kqiLa857odLXrIC`,
      expectedId: '1dolXnIeXKz-BH1BlwRDaKhzC2smJcGyVxMxGYhaY2kqiLa857odLXrIC',
    },
    // 以下は誤検知リスクが高いため削除
    // - "Library ID:" ラベルのみ: GASライブラリ以外の一般的なライブラリIDにもマッチ
    // - クォート内のID: コンテキストなしでは誤検知リスクが高い
    // 新規追加パターン
    {
      name: 'Find a Library テキストボックス形式（OAuth2ライブラリ）',
      content: `In the "Find a Library" text box, enter the script ID \`1B7FSrk5Zi6L1rSxxTDgDEUsPzlukDsi4KGuTMorsTQHhGBzBkMun4iDF\``,
      expectedId: '1B7FSrk5Zi6L1rSxxTDgDEUsPzlukDsi4KGuTMorsTQHhGBzBkMun4iDF',
    },
    {
      name: 'Input the Script ID in the text box形式',
      content: `Input the Script ID in the text box. The Script ID is 108j6x_ZX544wEhGkgddFYM6Ie09edDqXaFwnW3RVFQCLHw_mEueqUHTW`,
      expectedId: '108j6x_ZX544wEhGkgddFYM6Ie09edDqXaFwnW3RVFQCLHw_mEueqUHTW',
    },
    {
      name: 'Script ID of the library is形式',
      content: `Script ID of the library is 115-19njNHlbT-NI0hMPDnVO1sdrw2tJKCAJgOTIAPbi_jq3tOo4lVRov`,
      expectedId: '115-19njNHlbT-NI0hMPDnVO1sdrw2tJKCAJgOTIAPbi_jq3tOo4lVRov',
    },
    {
      name: 'Library project key is **`ID`** 形式（ボールド+バッククォート）',
      content: `Library's project key is **\`1HLv6tWz0oXFOJHerBTP8HsNmhpRqssijJatC92bv9Ym6HSN69_UuzcDk\`**`,
      expectedId: '1HLv6tWz0oXFOJHerBTP8HsNmhpRqssijJatC92bv9Ym6HSN69_UuzcDk',
    },
    {
      name: '# Library project key ヘッダー直後のコードブロック',
      content: `# Library's project key

\`\`\`
1FWYhQFhL7UIAZJn-FR3TlcHvXwHPJc2HwI4vtmNUAQv2OybGe-S97Lal
\`\`\``,
      expectedId: '1FWYhQFhL7UIAZJn-FR3TlcHvXwHPJc2HwI4vtmNUAQv2OybGe-S97Lal',
    },
    {
      name: 'The Script ID is 形式',
      content: `The Script ID is **\`1Xmtr5XXEakVql7N6FqwdCNdpdijsJOxgqH173JSB0UOwdb0GJYJbnJLk\`**`,
      expectedId: '1Xmtr5XXEakVql7N6FqwdCNdpdijsJOxgqH173JSB0UOwdb0GJYJbnJLk',
    },
    {
      name: 'install this library付近のID',
      content: `1. [Install this library](https://developers.google.com/apps-script/guides/libraries).

   - Library's project key is as follows.

\`\`\`
1g0_wywpigtU_xA01D5IrRuBuDD5unieYl7nVXQR8DM_An0eUnB0NcTcx
\`\`\``,
      expectedId: '1g0_wywpigtU_xA01D5IrRuBuDD5unieYl7nVXQR8DM_An0eUnB0NcTcx',
    },
  ];

  it.each(testCases)('ライブラリID記載パターンの個別テスト: $name', ({ content, expectedId }) => {
    const extractedIds = extractAllMatches(content);

    // 期待されるIDが正しく抽出されることを検証
    expect(extractedIds).toContain(expectedId);
  });

  const falsePositiveCases = [
    {
      name: 'GitHub URL内のコミットハッシュ',
      content: 'https://github.com/user/repo/commit/1a2b3c4d5e6f7890abcdef1234567890abcdef12',
    },
    {
      name: 'UUID形式',
      content: '1a2b3c4d-5e6f-7890-abcd-ef1234567890',
    },
    {
      name: 'JSONのemail_id',
      content: '"email_id": "1a2b3c4d5e6f7890abcdef1234567890"',
    },
    {
      name: '画像ファイルURL',
      content: 'https://example.com/image_1a2b3c4d5e6f7890abcdef1234567890.png',
    },
    // 誤検知防止: GASライブラリではない一般的なAPI/ライブラリ説明
    {
      name: 'Google Sheets API使用説明（誤検知防止）',
      content: `# Google Sheets API Example

This project uses the Google Sheets API to read and write spreadsheet data.

## Setup

1. Enable the Google Sheets API in your Google Cloud Console
2. Add the library to your project

The Google Sheets API provides powerful features for spreadsheet manipulation.`,
    },
    {
      name: 'npmライブラリインストール説明（誤検知防止）',
      content: `## Installation

Install this library using npm:

\`\`\`bash
npm install my-awesome-library
\`\`\`

Or add a library using yarn:

\`\`\`bash
yarn add my-awesome-library
\`\`\``,
    },
    {
      name: 'Resources > Libraries以外のリソース説明（誤検知防止）',
      content: `## Resources

Check out these resources and libraries for more information:

- [Official Documentation](https://example.com/docs)
- [API Reference](https://example.com/api)
- [Community Libraries](https://example.com/libs)`,
    },
  ];

  it.each(falsePositiveCases)('誤検知の回避テスト: $name', ({ content }) => {
    const foundMatches = extractAllMatches(content);

    // 誤検知が発生しないことを検証
    expect(foundMatches.length).toBe(0);
  });
});
