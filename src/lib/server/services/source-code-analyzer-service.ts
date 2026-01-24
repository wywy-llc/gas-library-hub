/**
 * ソースコード分析サービス
 *
 * リポジトリのソースコードを分析し、公開APIを抽出する。
 * usageExampleのバリデーションに使用される。
 */

import { GitHubApiUtils } from '$lib/server/utils/github-api-utils.js';
import type { PublicApi, RepositoryAnalysis, SourceFile } from '$lib/types/source-analysis.js';

/**
 * GASエントリーポイントのパターン（優先順位順）
 */
const ENTRY_POINT_PATTERNS = [
  'src/index.gs',
  'src/index.js',
  'src/main.gs',
  'src/main.js',
  'Code.gs',
  'Code.js',
  'index.gs',
  'index.js',
  'main.gs',
  'main.js',
  'lib/index.gs',
  'lib/index.js',
];

/**
 * ソースファイルとして認識する拡張子
 */
const SOURCE_EXTENSIONS = ['.gs', '.js', '.ts'];

/**
 * 除外するディレクトリパターン
 */
const EXCLUDED_DIRECTORIES = ['node_modules', 'test', 'tests', 'spec', 'dist', 'build', '.git'];

/**
 * 最大取得ファイル数
 */
const MAX_SOURCE_FILES = 10;

export const SourceCodeAnalyzerService = (() => {
  /**
   * リポジトリを分析して公開API情報を抽出
   * @param owner リポジトリオーナー名
   * @param repo リポジトリ名
   * @returns 分析結果
   */
  const analyzeRepository = async (owner: string, repo: string): Promise<RepositoryAnalysis> => {
    try {
      // 1. ツリー取得
      const tree = await GitHubApiUtils.fetchRepositoryTree(owner, repo);
      if (!tree) {
        return {
          success: false,
          error: 'リポジトリツリーを取得できませんでした',
        };
      }

      // truncatedの場合は警告
      if (tree.truncated) {
        console.warn(
          `[SourceCodeAnalyzer] リポジトリ ${owner}/${repo} のツリーが大きすぎるため一部のみ取得しました`
        );
      }

      // 2. ソースファイルを特定
      const sourceFilePaths = findSourceFiles(tree.tree.map(item => item.path));

      if (sourceFilePaths.length === 0) {
        return {
          success: false,
          error: 'ソースファイルが見つかりませんでした',
        };
      }

      // 3. エントリーポイントを特定
      const entryPoints = findEntryPoints(sourceFilePaths);

      // 4. ソースファイル取得（最大MAX_SOURCE_FILES件）
      const sourceFiles = await fetchSourceFiles(owner, repo, sourceFilePaths);

      if (sourceFiles.length === 0) {
        return {
          success: false,
          error: 'ソースファイルの内容を取得できませんでした',
        };
      }

      // 5. 公開API抽出
      const publicApis = extractPublicApis(sourceFiles);

      return {
        success: true,
        entryPoints,
        publicApis,
        sourceFiles,
      };
    } catch (error) {
      console.error('[SourceCodeAnalyzer] 分析エラー:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  };

  /**
   * ソースファイルを特定
   * @param allPaths 全ファイルパス
   * @returns ソースファイルパス
   */
  const findSourceFiles = (allPaths: string[]): string[] => {
    return allPaths
      .filter(path => {
        // ソース拡張子でフィルタ
        const hasSourceExtension = SOURCE_EXTENSIONS.some(ext => path.endsWith(ext));
        if (!hasSourceExtension) return false;

        // 除外ディレクトリをフィルタ
        const isExcluded = EXCLUDED_DIRECTORIES.some(
          dir => path.includes(`${dir}/`) || path.startsWith(`${dir}/`)
        );
        return !isExcluded;
      })
      .slice(0, MAX_SOURCE_FILES * 2); // エントリーポイント優先のため多めに取得
  };

  /**
   * エントリーポイントを特定
   * @param sourceFilePaths ソースファイルパス
   * @returns エントリーポイントパス
   */
  const findEntryPoints = (sourceFilePaths: string[]): string[] => {
    const entryPoints: string[] = [];

    // パターンに一致するものを優先順位順に追加
    for (const pattern of ENTRY_POINT_PATTERNS) {
      const match = sourceFilePaths.find(path => path === pattern || path.endsWith(`/${pattern}`));
      if (match && !entryPoints.includes(match)) {
        entryPoints.push(match);
      }
    }

    // パターンに一致しない場合は最初のソースファイルを使用
    if (entryPoints.length === 0 && sourceFilePaths.length > 0) {
      entryPoints.push(sourceFilePaths[0]);
    }

    return entryPoints;
  };

  /**
   * ソースファイルの内容を取得
   * @param owner リポジトリオーナー名
   * @param repo リポジトリ名
   * @param filePaths ファイルパス
   * @returns ソースファイル情報
   */
  const fetchSourceFiles = async (
    owner: string,
    repo: string,
    filePaths: string[]
  ): Promise<SourceFile[]> => {
    const sourceFiles: SourceFile[] = [];
    const pathsToFetch = filePaths.slice(0, MAX_SOURCE_FILES);

    // 並列で取得（最大5件ずつ）
    const batchSize = 5;
    for (let i = 0; i < pathsToFetch.length; i += batchSize) {
      const batch = pathsToFetch.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map(async path => {
          const content = await GitHubApiUtils.fetchFileContent(owner, repo, path);
          return content ? { path, content } : null;
        })
      );

      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          sourceFiles.push(result.value);
        }
      }
    }

    return sourceFiles;
  };

  /**
   * ソースコードから公開API（関数・クラス・メソッド）を抽出
   * @param sourceFiles ソースファイル
   * @returns 公開API情報
   */
  const extractPublicApis = (sourceFiles: SourceFile[]): PublicApi[] => {
    const apis: PublicApi[] = [];

    for (const file of sourceFiles) {
      const content = file.content;

      // 関数宣言: function functionName(
      const functionPattern = /(?:^|\n)\s*(?:export\s+)?function\s+(\w+)\s*\(/g;
      let match;
      while ((match = functionPattern.exec(content)) !== null) {
        apis.push({
          type: 'function',
          name: match[1],
          file: file.path,
        });
      }

      // クラス宣言: class ClassName
      const classPattern = /(?:^|\n)\s*(?:export\s+)?class\s+(\w+)/g;
      while ((match = classPattern.exec(content)) !== null) {
        const className = match[1];
        apis.push({
          type: 'class',
          name: className,
          file: file.path,
        });

        // クラスメソッドを抽出（シンプルな正規表現）
        const classBodyStart = content.indexOf(match[0]) + match[0].length;
        const classBody = extractClassBody(content, classBodyStart);
        if (classBody) {
          const methodPattern = /(?:^|\n)\s*(?:async\s+)?(\w+)\s*\([^)]*\)\s*\{/g;
          while ((match = methodPattern.exec(classBody)) !== null) {
            const methodName = match[1];
            // constructor は除外
            if (methodName !== 'constructor' && methodName !== className) {
              apis.push({
                type: 'method',
                name: `${className}.${methodName}`,
                file: file.path,
              });
            }
          }
        }
      }

      // const/let/var 変数エクスポート
      const varPattern = /(?:^|\n)\s*(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=/g;
      while ((match = varPattern.exec(content)) !== null) {
        apis.push({
          type: 'variable',
          name: match[1],
          file: file.path,
        });
      }
    }

    // 重複を除去
    const uniqueApis = apis.reduce<PublicApi[]>((acc, api) => {
      const exists = acc.some(a => a.type === api.type && a.name === api.name);
      if (!exists) {
        acc.push(api);
      }
      return acc;
    }, []);

    return uniqueApis;
  };

  /**
   * クラス本体を抽出（ブレース対応）
   * @param content ソースコード
   * @param startIndex 開始位置
   * @returns クラス本体
   */
  const extractClassBody = (content: string, startIndex: number): string | null => {
    let braceCount = 0;
    let started = false;
    let bodyStart = -1;

    for (let i = startIndex; i < content.length; i++) {
      const char = content[i];
      if (char === '{') {
        if (!started) {
          started = true;
          bodyStart = i + 1;
        }
        braceCount++;
      } else if (char === '}') {
        braceCount--;
        if (started && braceCount === 0) {
          return content.slice(bodyStart, i);
        }
      }
    }

    return null;
  };

  /**
   * プロンプト用のソースサマリーを生成
   * @param analysis 分析結果
   * @returns ソースサマリー文字列
   */
  const generateSourceSummary = (analysis: RepositoryAnalysis): string => {
    if (!analysis.success || !analysis.publicApis || analysis.publicApis.length === 0) {
      return '// ソースコード分析が利用できません';
    }

    const lines: string[] = ['## 公開API一覧（使用可能なメソッド）'];

    // グループ分け
    const functions = analysis.publicApis.filter(a => a.type === 'function');
    const classes = analysis.publicApis.filter(a => a.type === 'class');
    const methods = analysis.publicApis.filter(a => a.type === 'method');
    const variables = analysis.publicApis.filter(a => a.type === 'variable');

    if (functions.length > 0) {
      lines.push('\n### 関数');
      functions.forEach(f => lines.push(`- \`${f.name}()\``));
    }

    if (classes.length > 0) {
      lines.push('\n### クラス');
      classes.forEach(c => lines.push(`- \`${c.name}\``));
    }

    if (methods.length > 0) {
      lines.push('\n### メソッド');
      methods.forEach(m => lines.push(`- \`${m.name}()\``));
    }

    if (variables.length > 0) {
      lines.push('\n### 変数/定数');
      variables.forEach(v => lines.push(`- \`${v.name}\``));
    }

    lines.push('\n**重要**: usageExampleでは上記のAPIのみを使用してください。');

    return lines.join('\n');
  };

  return {
    analyzeRepository,
    extractPublicApis,
    generateSourceSummary,
    // テスト用にエクスポート
    findSourceFiles,
    findEntryPoints,
  } as const;
})();
