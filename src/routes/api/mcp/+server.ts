import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { GetLibraryApiService } from '$lib/server/services/get-library-api-service.js';
import { SearchLibrariesApiService } from '$lib/server/services/search-libraries-api-service.js';
import { APP_CONFIG } from '$lib/constants/app-config.js';

/**
 * MCP Server エンドポイント（HTTP/SSE Transport）
 *
 * このエンドポイントはMCPプロトコルに対応したシンプルなHTTP APIを提供します。
 * Claude DesktopやCursor等のMCPクライアントから利用可能です。
 *
 * サポートするメソッド:
 * - initialize: サーバー情報を返す
 * - tools/list: 利用可能なツール一覧
 * - tools/call: ツールの実行
 * - resources/list: 利用可能なリソース一覧
 * - resources/read: リソースの読み取り
 */

// MCP Server 情報
const SERVER_INFO = {
  name: 'gas-library-hub',
  version: '1.0.0',
  protocolVersion: '2024-11-05',
} as const;

// 利用可能なツール定義
const TOOLS = [
  {
    name: 'search_libraries',
    description:
      'Search for Google Apps Script libraries by keyword, tags, or criteria. Returns a list of matching libraries with their details.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search keyword (e.g., OAuth, Spreadsheet, Gmail)',
        },
        scriptType: {
          type: 'string',
          enum: ['library', 'web_app'],
          description: 'Filter by script type',
        },
        tags: {
          type: 'string',
          description: 'Comma-separated tags to filter by (e.g., "OAuth,認証")',
        },
        minStars: {
          type: 'number',
          description: 'Minimum star count',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results (default: 10, max: 100)',
          default: 10,
        },
        locale: {
          type: 'string',
          enum: ['ja', 'en'],
          description: 'Language for summaries (default: ja)',
          default: 'ja',
        },
      },
    },
  },
  {
    name: 'get_library_details',
    description:
      'Get detailed information about a specific GAS library including AI-generated summary, usage examples, and documentation.',
    inputSchema: {
      type: 'object',
      properties: {
        libraryId: {
          type: 'string',
          description: 'The library ID',
        },
      },
      required: ['libraryId'],
    },
  },
] as const;

// 利用可能なリソース定義
const RESOURCES = [
  {
    uri: 'gas-library-hub://catalog',
    name: 'Library Catalog',
    description: 'Browse all available GAS libraries',
    mimeType: 'application/json',
  },
] as const;

// 事前計算したGETレスポンス用リスト（毎回のmap処理を回避）
const TOOL_NAMES = TOOLS.map(t => t.name);
const RESOURCE_URIS = RESOURCES.map(r => r.uri);

// 型ガード用Set（O(1)ルックアップ）
const VALID_SCRIPT_TYPES = new Set(['library', 'web_app'] as const);
const VALID_LOCALES = new Set(['ja', 'en'] as const);

/** MCP ツールハンドラーの結果型 */
interface McpToolResult {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}

/** MCP リソースハンドラーの結果型 */
interface McpResourceResult {
  contents: Array<{ uri: string; mimeType: string; text: string }>;
}

/**
 * ツールハンドラーマップ
 * switch文の代わりにRecordベースで拡張性向上
 */
const toolHandlers: Record<string, (args: Record<string, unknown>) => Promise<McpToolResult>> = {
  search_libraries: async args => {
    const searchResult = await SearchLibrariesApiService.call({
      q: typeof args.query === 'string' ? args.query : undefined,
      scriptType: isValidScriptType(args.scriptType) ? args.scriptType : undefined,
      tags: typeof args.tags === 'string' ? args.tags : undefined,
      minStars: typeof args.minStars === 'number' ? args.minStars : undefined,
      limit: typeof args.limit === 'number' ? args.limit : 10,
      locale: isValidLocale(args.locale) ? args.locale : 'ja',
    });

    return {
      content: [{ type: 'text', text: JSON.stringify(searchResult.data) }],
    };
  },

  get_library_details: async args => {
    const libraryId = typeof args.libraryId === 'string' ? args.libraryId : null;

    if (!libraryId) {
      return {
        content: [{ type: 'text', text: 'Error: libraryId is required' }],
        isError: true,
      };
    }

    const detailResult = await GetLibraryApiService.call(libraryId);

    if (!detailResult) {
      return {
        content: [{ type: 'text', text: `Error: Library not found: ${libraryId}` }],
        isError: true,
      };
    }

    return {
      content: [{ type: 'text', text: JSON.stringify(detailResult.data) }],
    };
  },
};

/**
 * リソースハンドラーマップ
 */
const resourceHandlers: Record<string, () => Promise<McpResourceResult>> = {
  'gas-library-hub://catalog': async () => {
    const result = await SearchLibrariesApiService.call({ limit: 50, locale: 'ja' });

    return {
      contents: [
        {
          uri: 'gas-library-hub://catalog',
          mimeType: 'application/json',
          text: JSON.stringify({
            description: 'GAS Library Hub - Library Catalog',
            baseUrl: APP_CONFIG.BASE_URL,
            totalLibraries: result.data.pagination.total,
            libraries: result.data.libraries,
          }),
        },
      ],
    };
  },
};

/**
 * 型ガード: scriptType（Set lookup O(1)）
 */
function isValidScriptType(value: unknown): value is 'library' | 'web_app' {
  return typeof value === 'string' && VALID_SCRIPT_TYPES.has(value as 'library' | 'web_app');
}

/**
 * 型ガード: locale（Set lookup O(1)）
 */
function isValidLocale(value: unknown): value is 'ja' | 'en' {
  return typeof value === 'string' && VALID_LOCALES.has(value as 'ja' | 'en');
}

/**
 * MCP メソッドハンドラーマップ
 */
type McpMethodResult =
  | { protocolVersion: string; capabilities: object; serverInfo: object }
  | { tools: typeof TOOLS }
  | { resources: typeof RESOURCES }
  | McpToolResult
  | McpResourceResult;

const methodHandlers: Record<
  string,
  (params?: {
    name?: string;
    arguments?: Record<string, unknown>;
    uri?: string;
  }) => Promise<McpMethodResult>
> = {
  initialize: async () => ({
    protocolVersion: SERVER_INFO.protocolVersion,
    capabilities: { tools: {}, resources: {} },
    serverInfo: { name: SERVER_INFO.name, version: SERVER_INFO.version },
  }),

  'tools/list': async () => ({ tools: TOOLS }),

  'tools/call': async params => {
    const { name, arguments: args = {} } = params ?? {};
    const handler = name ? toolHandlers[name] : undefined;

    if (!handler) {
      return {
        content: [{ type: 'text', text: `Error: Unknown tool: ${name}` }],
        isError: true,
      };
    }

    return handler(args);
  },

  'resources/list': async () => ({ resources: RESOURCES }),

  'resources/read': async params => {
    const { uri } = params ?? {};
    const handler = uri ? resourceHandlers[uri] : undefined;

    if (!handler) {
      throw new Error(`Unknown resource: ${uri}`);
    }

    return handler();
  },
};

/**
 * MCP JSON-RPC リクエスト処理
 */
export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { method, params, id } = body;

    const handler = methodHandlers[method];

    if (!handler) {
      return json(
        {
          jsonrpc: '2.0',
          error: { code: -32601, message: `Method not found: ${method}` },
          id,
        },
        { status: 400 }
      );
    }

    const result = await handler(params);

    return json({ jsonrpc: '2.0', result, id });
  } catch (error) {
    console.error('❌ MCP Server error:', error);
    return json(
      {
        jsonrpc: '2.0',
        error: { code: -32603, message: 'Internal error' },
        id: null,
      },
      { status: 500 }
    );
  }
};

/**
 * サーバー情報取得（GET）
 */
export const GET: RequestHandler = async () => {
  return json({
    name: SERVER_INFO.name,
    version: SERVER_INFO.version,
    description:
      'MCP Server for GAS Library Hub - Search and discover Google Apps Script libraries',
    capabilities: ['tools', 'resources'],
    tools: TOOL_NAMES,
    resources: RESOURCE_URIS,
    documentation: `${APP_CONFIG.BASE_URL}/llms.txt`,
  });
};
