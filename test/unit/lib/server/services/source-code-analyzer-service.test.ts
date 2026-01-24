/**
 * ソースコード分析サービスのユニットテスト
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { SourceCodeAnalyzerService } from '$lib/server/services/source-code-analyzer-service.js';
import { GitHubApiUtils } from '$lib/server/utils/github-api-utils.js';
import type { GitHubTreeResponse } from '$lib/types/github-scraper.js';

// GitHubApiUtilsをモック
vi.mock('$lib/server/utils/github-api-utils.js', () => ({
  GitHubApiUtils: {
    fetchRepositoryTree: vi.fn(),
    fetchFileContent: vi.fn(),
  },
}));

describe('SourceCodeAnalyzerService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('analyzeRepository', () => {
    it('リポジトリツリーが取得できない場合はエラーを返す', async () => {
      vi.mocked(GitHubApiUtils.fetchRepositoryTree).mockResolvedValue(undefined);

      const result = await SourceCodeAnalyzerService.analyzeRepository('owner', 'repo');

      expect(result.success).toBe(false);
      expect(result.error).toBe('リポジトリツリーを取得できませんでした');
    });

    it('ソースファイルが見つからない場合はエラーを返す', async () => {
      const mockTree: GitHubTreeResponse = {
        sha: 'abc123',
        url: 'https://api.github.com/repos/owner/repo/git/trees/abc123',
        tree: [
          { path: 'README.md', mode: '100644', type: 'blob', sha: 'def456', url: '' },
          { path: 'LICENSE', mode: '100644', type: 'blob', sha: 'ghi789', url: '' },
        ],
        truncated: false,
      };

      vi.mocked(GitHubApiUtils.fetchRepositoryTree).mockResolvedValue(mockTree);

      const result = await SourceCodeAnalyzerService.analyzeRepository('owner', 'repo');

      expect(result.success).toBe(false);
      expect(result.error).toBe('ソースファイルが見つかりませんでした');
    });

    it('ソースファイルの内容を取得できない場合はエラーを返す', async () => {
      const mockTree: GitHubTreeResponse = {
        sha: 'abc123',
        url: 'https://api.github.com/repos/owner/repo/git/trees/abc123',
        tree: [{ path: 'Code.gs', mode: '100644', type: 'blob', sha: 'def456', url: '' }],
        truncated: false,
      };

      vi.mocked(GitHubApiUtils.fetchRepositoryTree).mockResolvedValue(mockTree);
      vi.mocked(GitHubApiUtils.fetchFileContent).mockResolvedValue(undefined);

      const result = await SourceCodeAnalyzerService.analyzeRepository('owner', 'repo');

      expect(result.success).toBe(false);
      expect(result.error).toBe('ソースファイルの内容を取得できませんでした');
    });

    it('成功時は公開APIを抽出して返す', async () => {
      const mockTree: GitHubTreeResponse = {
        sha: 'abc123',
        url: 'https://api.github.com/repos/owner/repo/git/trees/abc123',
        tree: [{ path: 'src/index.gs', mode: '100644', type: 'blob', sha: 'def456', url: '' }],
        truncated: false,
      };

      const mockContent = `
function createService() {
  return new OAuth2Service();
}

class OAuth2Service {
  getAuthUrl() {
    return 'https://example.com/auth';
  }
}
`;

      vi.mocked(GitHubApiUtils.fetchRepositoryTree).mockResolvedValue(mockTree);
      vi.mocked(GitHubApiUtils.fetchFileContent).mockResolvedValue(mockContent);

      const result = await SourceCodeAnalyzerService.analyzeRepository('owner', 'repo');

      expect(result.success).toBe(true);
      expect(result.entryPoints).toContain('src/index.gs');
      expect(result.publicApis).toBeDefined();
      expect(result.publicApis!.some(api => api.name === 'createService')).toBe(true);
      expect(result.publicApis!.some(api => api.name === 'OAuth2Service')).toBe(true);
      expect(result.publicApis!.some(api => api.name === 'OAuth2Service.getAuthUrl')).toBe(true);
    });
  });

  describe('extractPublicApis', () => {
    it('関数宣言を抽出する', () => {
      const sourceFiles = [
        {
          path: 'test.gs',
          content: `
function publicFunction() {
  return 'Hello';
}

function anotherFunction(param) {
  return param;
}
`,
        },
      ];

      const apis = SourceCodeAnalyzerService.extractPublicApis(sourceFiles);

      expect(apis).toHaveLength(2);
      expect(apis.some(api => api.name === 'publicFunction' && api.type === 'function')).toBe(true);
      expect(apis.some(api => api.name === 'anotherFunction' && api.type === 'function')).toBe(
        true
      );
    });

    it('クラス宣言を抽出する', () => {
      const sourceFiles = [
        {
          path: 'test.gs',
          content: `
class MyClass {
  constructor() {}
}

class AnotherClass {
  method() {}
}
`,
        },
      ];

      const apis = SourceCodeAnalyzerService.extractPublicApis(sourceFiles);

      const classes = apis.filter(api => api.type === 'class');
      expect(classes).toHaveLength(2);
      expect(classes.some(api => api.name === 'MyClass')).toBe(true);
      expect(classes.some(api => api.name === 'AnotherClass')).toBe(true);
    });

    it('クラスメソッドを抽出する', () => {
      const sourceFiles = [
        {
          path: 'test.gs',
          content: `
class MyService {
  initialize() {
    return this;
  }

  async fetchData() {
    return [];
  }
}
`,
        },
      ];

      const apis = SourceCodeAnalyzerService.extractPublicApis(sourceFiles);

      const methods = apis.filter(api => api.type === 'method');
      expect(methods.some(api => api.name === 'MyService.initialize')).toBe(true);
      expect(methods.some(api => api.name === 'MyService.fetchData')).toBe(true);
    });

    it('変数宣言を抽出する', () => {
      const sourceFiles = [
        {
          path: 'test.gs',
          content: `
const API_KEY = 'secret';
let counter = 0;
var globalVar = 'value';
`,
        },
      ];

      const apis = SourceCodeAnalyzerService.extractPublicApis(sourceFiles);

      const variables = apis.filter(api => api.type === 'variable');
      expect(variables.some(api => api.name === 'API_KEY')).toBe(true);
      expect(variables.some(api => api.name === 'counter')).toBe(true);
      expect(variables.some(api => api.name === 'globalVar')).toBe(true);
    });

    it('重複するAPIを除去する', () => {
      const sourceFiles = [
        {
          path: 'file1.gs',
          content: 'function sharedFunction() {}',
        },
        {
          path: 'file2.gs',
          content: 'function sharedFunction() {}',
        },
      ];

      const apis = SourceCodeAnalyzerService.extractPublicApis(sourceFiles);

      const sharedFunctions = apis.filter(api => api.name === 'sharedFunction');
      expect(sharedFunctions).toHaveLength(1);
    });

    it('exportキーワード付きの宣言も抽出する', () => {
      const sourceFiles = [
        {
          path: 'test.ts',
          content: `
export function exportedFunction() {}
export class ExportedClass {}
export const EXPORTED_CONST = 'value';
`,
        },
      ];

      const apis = SourceCodeAnalyzerService.extractPublicApis(sourceFiles);

      expect(apis.some(api => api.name === 'exportedFunction')).toBe(true);
      expect(apis.some(api => api.name === 'ExportedClass')).toBe(true);
      expect(apis.some(api => api.name === 'EXPORTED_CONST')).toBe(true);
    });
  });

  describe('generateSourceSummary', () => {
    it('成功した分析結果からサマリーを生成する', () => {
      const analysis = {
        success: true,
        entryPoints: ['src/index.gs'],
        publicApis: [
          { type: 'function' as const, name: 'createService', file: 'src/index.gs' },
          { type: 'class' as const, name: 'OAuth2Service', file: 'src/oauth2.gs' },
          { type: 'method' as const, name: 'OAuth2Service.getAuthUrl', file: 'src/oauth2.gs' },
          { type: 'variable' as const, name: 'DEFAULT_SCOPE', file: 'src/config.gs' },
        ],
        sourceFiles: [],
      };

      const summary = SourceCodeAnalyzerService.generateSourceSummary(analysis);

      expect(summary).toContain('## 公開API一覧');
      expect(summary).toContain('### 関数');
      expect(summary).toContain('`createService()`');
      expect(summary).toContain('### クラス');
      expect(summary).toContain('`OAuth2Service`');
      expect(summary).toContain('### メソッド');
      expect(summary).toContain('`OAuth2Service.getAuthUrl()`');
      expect(summary).toContain('### 変数/定数');
      expect(summary).toContain('`DEFAULT_SCOPE`');
      expect(summary).toContain('**重要**');
    });

    it('失敗した分析結果の場合はコメントを返す', () => {
      const analysis = {
        success: false,
        error: 'エラーメッセージ',
      };

      const summary = SourceCodeAnalyzerService.generateSourceSummary(analysis);

      expect(summary).toBe('// ソースコード分析が利用できません');
    });

    it('公開APIが空の場合はコメントを返す', () => {
      const analysis = {
        success: true,
        entryPoints: [],
        publicApis: [],
        sourceFiles: [],
      };

      const summary = SourceCodeAnalyzerService.generateSourceSummary(analysis);

      expect(summary).toBe('// ソースコード分析が利用できません');
    });
  });

  describe('findSourceFiles', () => {
    it('GASファイルを検出する', () => {
      const paths = ['Code.gs', 'lib/utils.gs', 'src/main.gs'];
      const result = SourceCodeAnalyzerService.findSourceFiles(paths);

      expect(result).toEqual(paths);
    });

    it('JSファイルを検出する', () => {
      const paths = ['index.js', 'lib/helper.js'];
      const result = SourceCodeAnalyzerService.findSourceFiles(paths);

      expect(result).toEqual(paths);
    });

    it('TSファイルを検出する', () => {
      const paths = ['src/index.ts', 'lib/types.ts'];
      const result = SourceCodeAnalyzerService.findSourceFiles(paths);

      expect(result).toEqual(paths);
    });

    it('除外ディレクトリ内のファイルを除外する', () => {
      const paths = [
        'src/index.gs',
        'node_modules/pkg/index.js',
        'test/sample.test.ts',
        'tests/unit.ts',
        'dist/bundle.js',
        '.git/hooks/pre-commit',
      ];

      const result = SourceCodeAnalyzerService.findSourceFiles(paths);

      expect(result).toEqual(['src/index.gs']);
    });

    it('非ソースファイルを除外する', () => {
      const paths = ['README.md', 'package.json', 'src/index.gs', 'styles.css'];

      const result = SourceCodeAnalyzerService.findSourceFiles(paths);

      expect(result).toEqual(['src/index.gs']);
    });
  });

  describe('findEntryPoints', () => {
    it('優先度順にエントリーポイントを検出する', () => {
      const paths = ['Code.gs', 'src/index.gs', 'main.gs'];

      const result = SourceCodeAnalyzerService.findEntryPoints(paths);

      // src/index.gsが最優先
      expect(result[0]).toBe('src/index.gs');
    });

    it('パターンに一致しない場合は最初のファイルを使用する', () => {
      const paths = ['lib/helper.gs', 'utils/format.gs'];

      const result = SourceCodeAnalyzerService.findEntryPoints(paths);

      expect(result[0]).toBe('lib/helper.gs');
    });

    it('複数のエントリーポイントパターンに一致する場合は全て返す', () => {
      const paths = ['src/index.gs', 'Code.gs', 'main.gs'];

      const result = SourceCodeAnalyzerService.findEntryPoints(paths);

      expect(result).toContain('src/index.gs');
      expect(result).toContain('Code.gs');
      expect(result).toContain('main.gs');
    });
  });
});
