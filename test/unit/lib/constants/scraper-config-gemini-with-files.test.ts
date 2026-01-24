import { describe, expect, it } from 'vitest';
import { GASScriptIdExtractor } from '../../../../src/lib/server/utils/gas-script-id-extractor.js';

describe('GeminiWithFiles実際のREADME抽出テスト', () => {
  it('実際のGeminiWithFilesのREADMEからライブラリIDを抽出', () => {
    // 問題となっているGeminiWithFilesの実際のREADME内容
    const actualGeminiWithFilesReadme = `# GeminiWithFiles

<a name="top"></a>
[![MIT License](http://img.shields.io/badge/license-MIT-blue.svg?style=flat)](LICENCE)

# IMPORTANT
Gemini API is continuing to grow. On August 5, 2024, I largely updated GeminiWithFiles to v2.x.x. With this large update, the version is changed from v1 to v2.

If you want to use GeminiWithFiles v1.x.x, please see [here](old_v1.x.x/README.md).

<a name="overview"></a>

![](images/fig1.jpg)

# Overview

This is a Google Apps Script library for Gemini API with files.

A new Google Apps Script library called GeminiWithFiles simplifies using Gemini, a large language model, to process unstructured data like images and PDFs. GeminiWithFiles can upload files, generate content, and create descriptions from multiple images at once. This significantly reduces workload and expands possibilities for using Gemini.

# Usage

In order to test this script, please do the following steps.

## 1. Create an API key

Please access [https://makersuite.google.com/app/apikey](https://makersuite.google.com/app/apikey) and create your API key. At that time, please enable Generative Language API at the API console. This API key is used for this sample script.

This official document can also be seen. [Ref](https://ai.google.dev/).

## 2. Create a Google Apps Script project

Please create a standalone Google Apps Script project. Of course, this script can also be used with the container-bound script.

And, please open the script editor of the Google Apps Script project.

## 3. How to use GeminiWithFiles

There are 2 patterns for using GeminiWithFiles.

### 1. Use GeminiWithFiles as a Google Apps Script library

If you use this library as a Google Apps Script library, please install the library to your Google Apps Script project as follows.

1. Create a Google Apps Script project. Or, open your Google Apps Script project.

   - You can use this library for the Google Apps Script project of both the standalone and container-bound script types.

2. [Install this library](https://developers.google.com/apps-script/guides/libraries).

   - The library's project key is as follows.

\`\`\`
1dolXnIeXKz-BH1BlwRDaKhzC2smJcGyVxMxGYhaY2kqiLa857odLXrIC
\`\`\`

### 2. Use GeminiWithFiles in your own Google Apps Script project

If you use this library in your own Google Apps Script project, please copy and paste the script ["classGeminiWithFiles.js"](https://github.com/tanaikech/GeminiWithFiles/blob/master/classGeminiWithFiles.js) into your Google Apps Script project. By this, the script can be used.

"main.js" is used for the Google Apps Script library. So, in this pattern, you are not required to use it.

# Scopes

This library uses the following 2 scopes.

- \`https://www.googleapis.com/auth/script.external_request\`
- \`https://www.googleapis.com/auth/drive\`

If you want to use the access token, please link the Google Cloud Platform Project to the Google Apps Script Project. And, please add the following scope.

- \`https://www.googleapis.com/auth/generative-language\`

Also, you can see the official document of Gemini API at [https://ai.google.dev/api/rest](https://ai.google.dev/api/rest).`;

    const expectedLibraryId = '1dolXnIeXKz-BH1BlwRDaKhzC2smJcGyVxMxGYhaY2kqiLa857odLXrIC';
    const result = GASScriptIdExtractor.extractScriptId(actualGeminiWithFilesReadme);

    expect(result).toBe(expectedLibraryId);
  });

  it('コードブロック内の単独IDが抽出されることを確認', () => {
    const readmeWithCodeBlock = `# Library Usage

Install the library:

\`\`\`
1dolXnIeXKz-BH1BlwRDaKhzC2smJcGyVxMxGYhaY2kqiLa857odLXrIC
\`\`\`

Alternative method:
Script ID: 1AnotherScriptId1234567890123456789012345678901234567890123`;

    const result = GASScriptIdExtractor.extractScriptId(readmeWithCodeBlock);
    // コードブロック内の単独IDパターンが先にマッチするため、コードブロック内のIDが抽出される
    // これはGASライブラリでよく使われるパターン（tanaikech氏のライブラリなど）に対応
    const expectedFirstId = '1dolXnIeXKz-BH1BlwRDaKhzC2smJcGyVxMxGYhaY2kqiLa857odLXrIC';

    expect(result).toBe(expectedFirstId);
  });

  it('UUID形式の誤検知を防ぐ', () => {
    const readmeWithUuid = `# Test Project

Some UUID: 1a2b3c4d-5e6f-7890-abcd-ef1234567890

Real script ID: 1dolXnIeXKz-BH1BlwRDaKhzC2smJcGyVxMxGYhaY2kqiLa857odLXrIC`;

    const result = GASScriptIdExtractor.extractScriptId(readmeWithUuid);
    const expectedId = '1dolXnIeXKz-BH1BlwRDaKhzC2smJcGyVxMxGYhaY2kqiLa857odLXrIC';

    expect(result).toBe(expectedId);
  });

  it('GitHub URL内のIDの誤検知を防ぐ', () => {
    const readmeWithGitHubUrl = `# Test Project

![Image](https://github.com/user/repo/blob/main/images/103873116-2dd87e00-5084-11eb-8ab6-d4c1b7be8ec6.png)

Script ID: 1dolXnIeXKz-BH1BlwRDaKhzC2smJcGyVxMxGYhaY2kqiLa857odLXrIC`;

    const result = GASScriptIdExtractor.extractScriptId(readmeWithGitHubUrl);
    const expectedId = '1dolXnIeXKz-BH1BlwRDaKhzC2smJcGyVxMxGYhaY2kqiLa857odLXrIC';

    expect(result).toBe(expectedId);
  });

  it('ライブラリID文字列の妥当性を確認', () => {
    const libraryId = '1dolXnIeXKz-BH1BlwRDaKhzC2smJcGyVxMxGYhaY2kqiLa857odLXrIC';

    // 基本的な形式チェック
    expect(libraryId.startsWith('1')).toBe(true);
    expect(libraryId.length).toBeGreaterThan(50);
    expect(libraryId.length).toBeLessThan(70);
    expect(/^[A-Za-z0-9_-]+$/.test(libraryId)).toBe(true);
  });
});
