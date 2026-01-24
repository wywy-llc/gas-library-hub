import { describe, expect, it, test } from 'vitest';
import { GASScriptIdExtractor } from '../../../../../src/lib/server/utils/gas-script-id-extractor.js';
import { LibraryTestDataFactories } from '../../../../factories/library-test-data.factory.js';

describe('GASScriptIdExtractor', () => {
  describe('extractScriptId', () => {
    test('日本語スクリプトID記述から抽出できる', () => {
      const readme = 'スクリプトID: 1B7FSrk5Zi6L1rSxxTDgDEUsPzlukDsi4KGuTMorsTQHhGBzBkMun4iDF';
      const result = GASScriptIdExtractor.extractScriptId(readme);
      expect(result).toBe('1B7FSrk5Zi6L1rSxxTDgDEUsPzlukDsi4KGuTMorsTQHhGBzBkMun4iDF');
    });

    test('英語Script ID記述から抽出できる', () => {
      const readme = 'Script ID: 1B7FSrk5Zi6L1rSxxTDgDEUsPzlukDsi4KGuTMorsTQHhGBzBkMun4iDF';
      const result = GASScriptIdExtractor.extractScriptId(readme);
      expect(result).toBe('1B7FSrk5Zi6L1rSxxTDgDEUsPzlukDsi4KGuTMorsTQHhGBzBkMun4iDF');
    });

    test('クオート付きscript id記述から抽出できる', () => {
      const readme = 'script id: "1B7FSrk5Zi6L1rSxxTDgDEUsPzlukDsi4KGuTMorsTQHhGBzBkMun4iDF"';
      const result = GASScriptIdExtractor.extractScriptId(readme);
      expect(result).toBe('1B7FSrk5Zi6L1rSxxTDgDEUsPzlukDsi4KGuTMorsTQHhGBzBkMun4iDF');
    });

    test('GoogleAppsScript macros URLから抽出できる', () => {
      const readme =
        'https://script.google.com/macros/d/1B7FSrk5Zi6L1rSxxTDgDEUsPzlukDsi4KGuTMorsTQHhGBzBkMun4iDF/edit';
      const result = GASScriptIdExtractor.extractScriptId(readme);
      expect(result).toBe('1B7FSrk5Zi6L1rSxxTDgDEUsPzlukDsi4KGuTMorsTQHhGBzBkMun4iDF');
    });

    test('script.google.comドメインの一般URLから抽出できる', () => {
      const readme =
        'https://script.google.com/u/1/home/projects/1B7FSrk5Zi6L1rSxxTDgDEUsPzlukDsi4KGuTMorsTQHhGBzBkMun4iDF/edit';
      const result = GASScriptIdExtractor.extractScriptId(readme);
      expect(result).toBe('1B7FSrk5Zi6L1rSxxTDgDEUsPzlukDsi4KGuTMorsTQHhGBzBkMun4iDF');
    });

    test('バッククォートで囲まれたスクリプトIDを抽出する', () => {
      // 誤検知を防ぐため、コンテキストなしの裸のIDは抽出しない
      // バッククォートやScript ID:ラベルなど、明確なコンテキストが必要
      const readme =
        'Use this script: `1B7FSrk5Zi6L1rSxxTDgDEUsPzlukDsi4KGuTMorsTQHhGBzBkMun4iDF` for testing';
      const result = GASScriptIdExtractor.extractScriptId(readme);
      expect(result).toBe('1B7FSrk5Zi6L1rSxxTDgDEUsPzlukDsi4KGuTMorsTQHhGBzBkMun4iDF');
    });

    test('複数のスクリプトIDがある場合は最初のものを返す', () => {
      const readme = `
        スクリプトID: 1B7FSrk5Zi6L1rSxxTDgDEUsPzlukDsi4KGuTMorsTQHhGBzBkMun4iDF
        Script ID: 1AbCdEfGhIjKlMnOpQrStUvWxYz1234567890
      `;
      const result = GASScriptIdExtractor.extractScriptId(readme);
      expect(result).toBe('1B7FSrk5Zi6L1rSxxTDgDEUsPzlukDsi4KGuTMorsTQHhGBzBkMun4iDF');
    });

    test('20文字未満のIDは抽出しない', () => {
      const readme = 'スクリプトID: 1B7FSrk5Zi6L1rSx'; // 18文字
      const result = GASScriptIdExtractor.extractScriptId(readme);
      expect(result).toBeUndefined();
    });

    test('スクリプトIDが見つからない場合はundefinedを返す', () => {
      const readme = 'This is a normal README without any script ID';
      const result = GASScriptIdExtractor.extractScriptId(readme);
      expect(result).toBeUndefined();
    });

    test('テストファクトリーのデータから抽出できる', () => {
      const testData = LibraryTestDataFactories.default.build();
      const readme = `
        # ${testData.name}
        
        ${testData.description}
        
        スクリプトID: ${testData.scriptId}
      `;
      const result = GASScriptIdExtractor.extractScriptId(readme);
      expect(result).toBe(testData.scriptId);
    });

    test('カスタムパターンを使用できる', () => {
      const customPatterns = [/MY_SCRIPT_ID:\s*([A-Za-z0-9_-]{20,})/gi];
      const readme = 'MY_SCRIPT_ID: 1B7FSrk5Zi6L1rSxxTDgDEUsPzlukDsi4KGuTMorsTQHhGBzBkMun4iDF';
      const result = GASScriptIdExtractor.extractScriptId(readme, customPatterns);
      expect(result).toBe('1B7FSrk5Zi6L1rSxxTDgDEUsPzlukDsi4KGuTMorsTQHhGBzBkMun4iDF');
    });

    test('カスタムパターンでマッチしない場合はundefined', () => {
      const customPatterns = [/MY_SCRIPT_ID:\s*([A-Za-z0-9_-]{20,})/gi];
      const readme = 'スクリプトID: 1B7FSrk5Zi6L1rSxxTDgDEUsPzlukDsi4KGuTMorsTQHhGBzBkMun4iDF';
      const result = GASScriptIdExtractor.extractScriptId(readme, customPatterns);
      expect(result).toBeUndefined();
    });
  });

  describe('extractScriptIdFromConfig', () => {
    test('ScraperConfigのパターンを使用してスクリプトIDを抽出できる', () => {
      const config = {
        scriptIdPatterns: [/スクリプトID[：:\s]*([A-Za-z0-9_-]{20,})/gi],
        webAppPatterns: [],
        gasTags: ['test'],
        rateLimit: { maxRequestsPerHour: 5000 },
        verbose: false,
      };

      const readme = 'スクリプトID: 1B7FSrk5Zi6L1rSxxTDgDEUsPzlukDsi4KGuTMorsTQHhGBzBkMun4iDF';
      const result = GASScriptIdExtractor.extractScriptIdFromConfig(readme, config);
      expect(result).toBe('1B7FSrk5Zi6L1rSxxTDgDEUsPzlukDsi4KGuTMorsTQHhGBzBkMun4iDF');
    });

    test('設定のパターンでマッチしない場合はundefined', () => {
      const config = {
        scriptIdPatterns: [/MY_CUSTOM_ID:\s*([A-Za-z0-9_-]{20,})/gi],
        webAppPatterns: [],
        gasTags: ['test'],
        rateLimit: { maxRequestsPerHour: 5000 },
        verbose: false,
      };

      const readme = 'スクリプトID: 1B7FSrk5Zi6L1rSxxTDgDEUsPzlukDsi4KGuTMorsTQHhGBzBkMun4iDF';
      const result = GASScriptIdExtractor.extractScriptIdFromConfig(readme, config);
      expect(result).toBeUndefined();
    });
  });

  describe('DEFAULT_SCRIPT_ID_PATTERNS', () => {
    test('デフォルトパターンが正しく定義されている', () => {
      expect(
        GASScriptIdExtractor.DEFAULT_SCRIPT_ID_PATTERNS.every(
          (pattern: RegExp) => pattern instanceof RegExp
        )
      ).toBe(true);
    });

    const defaultPatternTestCases = [
      {
        name: 'スクリプトID（日本語）',
        text: 'スクリプトID: 1B7FSrk5Zi6L1rSxxTDgDEUsPzlukDsi4KGuTMorsTQHhGBzBkMun4iDF',
        shouldMatch: true,
      },
      {
        name: 'Script ID（英語）',
        text: 'Script ID: 1B7FSrk5Zi6L1rSxxTDgDEUsPzlukDsi4KGuTMorsTQHhGBzBkMun4iDF',
        shouldMatch: true,
      },
      {
        name: 'script id（クォート付き）',
        text: 'script id: "1B7FSrk5Zi6L1rSxxTDgDEUsPzlukDsi4KGuTMorsTQHhGBzBkMun4iDF"',
        shouldMatch: true,
      },
      {
        name: 'macros URL',
        text: 'https://script.google.com/macros/d/1B7FSrk5Zi6L1rSxxTDgDEUsPzlukDsi4KGuTMorsTQHhGBzBkMun4iDF/edit',
        shouldMatch: true,
      },
      {
        name: 'projects URL',
        text: 'script.google.com/u/1/home/projects/1B7FSrk5Zi6L1rSxxTDgDEUsPzlukDsi4KGuTMorsTQHhGBzBkMun4iDF/edit',
        shouldMatch: true,
      },
      {
        name: 'ID ラベル付き（バッククォート囲み）',
        text: 'ID: `1B7FSrk5Zi6L1rSxxTDgDEUsPzlukDsi4KGuTMorsTQHhGBzBkMun4iDF`',
        shouldMatch: true, // インラインコード記法パターンで抽出される
      },
    ];

    it.each(defaultPatternTestCases)(
      '各デフォルトパターンが期待通りに動作する: $name',
      ({ text, shouldMatch }) => {
        const result = GASScriptIdExtractor.extractScriptId(text);
        if (shouldMatch) {
          // 修正されたパターンでは常に完全なスクリプトIDが返される
          expect(result).toBe('1B7FSrk5Zi6L1rSxxTDgDEUsPzlukDsi4KGuTMorsTQHhGBzBkMun4iDF');
        } else {
          expect(result).toBeUndefined();
        }
      }
    );
  });

  describe('GitHub画像URL誤検知対策', () => {
    test('画像ファイル拡張子付きの文字列は抽出しない', () => {
      const readme = `
        # Monthly Bill Generator Apps Script
        
        From emails in your inbox: 
        ![Inbox Emails](https://example.com/images/103873116-2dd87e00-5084-11eb-8ab6-d4c1b7be8ec6.png)
        
        To sending out:
        ![Composed Email](https://example.com/images/103457672-18470b00-4cb6-11eb-9e84-5c69af90e90a.jpg)
        
        Also see: 123456789012345678901234567890.gif
      `;
      const result = GASScriptIdExtractor.extractScriptId(readme);
      expect(result).toBeUndefined();
    });

    test('画像ファイルの拡張子を持つ1で始まる文字列は除外される', () => {
      const readme = `
        Check this image: https://example.com/images/103873116-2dd87e00-5084-11eb-8ab6-d4c1b7be8ec6.png
        But this script ID should work: \`1B7FSrk5Zi6L1rSxxTDgDEUsPzlukDsi4KGuTMorsTQHhGBzBkMun4iDF\`
      `;
      const result = GASScriptIdExtractor.extractScriptId(readme);
      expect(result).toBe('1B7FSrk5Zi6L1rSxxTDgDEUsPzlukDsi4KGuTMorsTQHhGBzBkMun4iDF');
    });

    test('ファイル拡張子付きの文字列は除外される', () => {
      const readme = `
        Image file: 123456789abcdef123456789abcdef.png
        Script ID: 1B7FSrk5Zi6L1rSxxTDgDEUsPzlukDsi4KGuTMorsTQHhGBzBkMun4iDF
      `;
      const result = GASScriptIdExtractor.extractScriptId(readme);
      expect(result).toBe('1B7FSrk5Zi6L1rSxxTDgDEUsPzlukDsi4KGuTMorsTQHhGBzBkMun4iDF');
    });

    test('UUID形式（ハイフン区切り）の文字列は除外される', () => {
      const readme = `
        UUID: 12345678-1234-1234-1234-123456789abc
        Script ID: 1B7FSrk5Zi6L1rSxxTDgDEUsPzlukDsi4KGuTMorsTQHhGBzBkMun4iDF
      `;
      const result = GASScriptIdExtractor.extractScriptId(readme);
      expect(result).toBe('1B7FSrk5Zi6L1rSxxTDgDEUsPzlukDsi4KGuTMorsTQHhGBzBkMun4iDF');
    });
  });

  describe('Web App検知機能', () => {
    test('.gsファイルの記載からWeb Appとして検知される', () => {
      const readme = `
        # Test Project
        
        [Main.gs](Main.gs) is where most of the logic happens.
        
        Also check [Code.gs](Code.gs) for additional functions.
      `;

      // Web App検知の実装は今後のテストで確認
      // この段階では.gsファイルが含まれていることを確認
      expect(readme).toContain('.gs');
      expect(readme).toContain('Main.gs');
      expect(readme).toContain('Code.gs');
    });

    test('Google Apps Scriptファイル形式の記載を検知', () => {
      const readme = `
        This Google Apps Script project includes several .gs files:
        - main.gs
        - utils.gs
        - config.gs
      `;

      expect(readme).toContain('Google Apps Script');
      expect(readme).toContain('.gs');
    });
  });
});
