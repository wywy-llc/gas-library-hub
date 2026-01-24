import { expect, test } from '@playwright/test';

test.describe('Public Library API', () => {
  test.describe('GET /api/libraries - Search API', () => {
    test('検索APIが公開ライブラリ一覧を返す', async ({ request }) => {
      const response = await request.get('/api/libraries');

      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(200);

      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.data.libraries).toBeDefined();
      expect(Array.isArray(data.data.libraries)).toBe(true);
      expect(data.data.pagination).toBeDefined();
      expect(data.data.pagination.page).toBe(1);
      expect(data.meta).toBeDefined();

      console.log(`✅ 検索API: ${data.data.pagination.total}件のライブラリを取得`);
    });

    test('検索APIでキーワード検索が動作する', async ({ request }) => {
      const response = await request.get('/api/libraries?q=OAuth');

      expect(response.ok()).toBeTruthy();

      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.meta.query).toBe('OAuth');

      // OAuth関連のライブラリが含まれているか確認（データがある場合）
      if (data.data.libraries.length > 0) {
        const hasOAuthRelated = data.data.libraries.some(
          (lib: { name: string; description: string | null; tags: string[] }) =>
            lib.name.toLowerCase().includes('oauth') ||
            lib.description?.toLowerCase().includes('oauth') ||
            lib.tags.some((tag: string) => tag.toLowerCase().includes('oauth'))
        );
        expect(hasOAuthRelated).toBe(true);
      }

      console.log(`✅ キーワード検索: "OAuth"で${data.data.libraries.length}件を取得`);
    });

    test('検索APIでscriptTypeフィルタが動作する', async ({ request }) => {
      const response = await request.get('/api/libraries?scriptType=library');

      expect(response.ok()).toBeTruthy();

      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.meta.filters.scriptType).toBe('library');

      // 全ての結果がlibrary型であることを確認
      data.data.libraries.forEach((lib: { scriptType: string }) => {
        expect(lib.scriptType).toBe('library');
      });

      console.log(`✅ scriptTypeフィルタ: library ${data.data.libraries.length}件`);
    });

    test('検索APIでページネーションが動作する', async ({ request }) => {
      // 1ページ目を取得
      const response1 = await request.get('/api/libraries?limit=2&page=1');
      const data1 = await response1.json();

      expect(data1.success).toBe(true);
      expect(data1.data.libraries.length).toBeLessThanOrEqual(2);
      expect(data1.data.pagination.page).toBe(1);
      expect(data1.data.pagination.limit).toBe(2);
      expect(data1.data.pagination.hasPrev).toBe(false);

      // 複数ページある場合は2ページ目も確認
      if (data1.data.pagination.hasNext) {
        const response2 = await request.get('/api/libraries?limit=2&page=2');
        const data2 = await response2.json();

        expect(data2.success).toBe(true);
        expect(data2.data.pagination.page).toBe(2);
        expect(data2.data.pagination.hasPrev).toBe(true);

        // 1ページ目と2ページ目のIDが異なることを確認
        const ids1 = data1.data.libraries.map((l: { id: string }) => l.id);
        const ids2 = data2.data.libraries.map((l: { id: string }) => l.id);
        const hasOverlap = ids1.some((id: string) => ids2.includes(id));
        expect(hasOverlap).toBe(false);
      }

      console.log(`✅ ページネーション: limit=2, 合計${data1.data.pagination.totalPages}ページ`);
    });

    test('検索APIでソートが動作する', async ({ request }) => {
      // スター数降順（デフォルト）
      const responseStars = await request.get('/api/libraries?sort=stars&order=desc&limit=5');
      const dataStars = await responseStars.json();

      expect(dataStars.success).toBe(true);

      // スター数が降順になっていることを確認
      const starCounts = dataStars.data.libraries.map((l: { starCount: number }) => l.starCount);
      for (let i = 1; i < starCounts.length; i++) {
        expect(starCounts[i - 1]).toBeGreaterThanOrEqual(starCounts[i]);
      }

      console.log(`✅ ソート: stars desc - 最高${starCounts[0]}スター`);
    });

    test('検索APIでlocaleパラメータが動作する', async ({ request }) => {
      // 日本語
      const responseJa = await request.get('/api/libraries?locale=ja&limit=1');
      const dataJa = await responseJa.json();

      // 英語
      const responseEn = await request.get('/api/libraries?locale=en&limit=1');
      const dataEn = await responseEn.json();

      expect(dataJa.success).toBe(true);
      expect(dataEn.success).toBe(true);

      console.log('✅ localeパラメータ: ja/en 両方動作');
    });

    test('検索APIで不正なパラメータがエラーを返す', async ({ request }) => {
      // 不正なpage
      const response = await request.get('/api/libraries?page=-1');

      expect(response.status()).toBe(400);

      const data = await response.json();

      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INVALID_PARAMS');

      console.log('✅ 不正パラメータ: 400エラーを返却');
    });

    test('検索APIのCache-Controlヘッダーが設定されている', async ({ request }) => {
      const response = await request.get('/api/libraries');

      expect(response.ok()).toBeTruthy();

      const cacheControl = response.headers()['cache-control'];
      expect(cacheControl).toBeDefined();
      expect(cacheControl).toContain('public');

      console.log(`✅ Cache-Control: ${cacheControl}`);
    });
  });

  test.describe('GET /api/libraries/[id] - Detail API', () => {
    let existingLibraryId: string;

    test.beforeAll(async ({ request }) => {
      // 存在するライブラリIDを取得
      const response = await request.get('/api/libraries?limit=1');
      const data = await response.json();

      if (data.data.libraries.length > 0) {
        existingLibraryId = data.data.libraries[0].id;
      }
    });

    test('詳細APIが公開ライブラリの詳細を返す', async ({ request }) => {
      test.skip(!existingLibraryId, '公開ライブラリが存在しません');

      const response = await request.get(`/api/libraries/${existingLibraryId}`);

      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(200);

      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.data.id).toBe(existingLibraryId);
      expect(data.data.name).toBeDefined();
      expect(data.data.scriptId).toBeDefined();
      expect(data.data.repositoryUrl).toBeDefined();
      expect(data.data.scriptType).toMatch(/^(library|web_app)$/);

      console.log(`✅ 詳細API: ${data.data.name} を取得`);
    });

    test('詳細APIがAI要約を含むレスポンスを返す', async ({ request }) => {
      test.skip(!existingLibraryId, '公開ライブラリが存在しません');

      const response = await request.get(`/api/libraries/${existingLibraryId}`);
      const data = await response.json();

      expect(data.success).toBe(true);

      // summaryが存在する場合、構造を確認
      if (data.data.summary) {
        expect(data.data.summary.libraryName).toBeDefined();
        expect(data.data.summary.purpose).toBeDefined();
        expect(data.data.summary.tags).toBeDefined();
        expect(data.data.summary.seo).toBeDefined();

        console.log(`✅ AI要約: ${data.data.summary.purpose?.ja || 'N/A'}`);
      } else {
        console.log('✅ AI要約: なし（null）');
      }
    });

    test('詳細APIで存在しないIDが404を返す', async ({ request }) => {
      const response = await request.get('/api/libraries/non-existent-id-12345');

      expect(response.status()).toBe(404);

      const data = await response.json();

      expect(data.success).toBe(false);
      expect(data.error.code).toBe('NOT_FOUND');

      console.log('✅ 存在しないID: 404エラーを返却');
    });

    test('詳細APIのCache-Controlヘッダーが設定されている', async ({ request }) => {
      test.skip(!existingLibraryId, '公開ライブラリが存在しません');

      const response = await request.get(`/api/libraries/${existingLibraryId}`);

      expect(response.ok()).toBeTruthy();

      const cacheControl = response.headers()['cache-control'];
      expect(cacheControl).toBeDefined();
      expect(cacheControl).toContain('public');

      console.log(`✅ Cache-Control: ${cacheControl}`);
    });
  });

  test.describe('GET /llms.txt - LLM Discovery', () => {
    test('llms.txtがサイト情報を返す', async ({ request }) => {
      const response = await request.get('/llms.txt');

      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(200);

      const contentType = response.headers()['content-type'];
      expect(contentType).toContain('text/plain');

      const text = await response.text();

      expect(text).toContain('GAS Library Hub');
      expect(text).toContain('/api/mcp');
      expect(text).toContain('Google Apps Script');

      console.log('✅ llms.txt: サイト情報を取得');
    });

    test('llms-full.txtがライブラリ一覧を返す', async ({ request }) => {
      const response = await request.get('/llms-full.txt');

      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(200);

      const text = await response.text();

      expect(text).toContain('Library Catalog');
      expect(text).toContain('Total:');
      expect(text).toContain('Last updated:');

      console.log('✅ llms-full.txt: ライブラリカタログを取得');
    });
  });

  test.describe('MCP Server API', () => {
    test('MCP Serverがサーバー情報を返す', async ({ request }) => {
      const response = await request.get('/api/mcp');

      expect(response.ok()).toBeTruthy();

      const data = await response.json();

      expect(data.name).toBe('gas-library-hub');
      expect(data.version).toBeDefined();
      expect(data.capabilities).toContain('tools');
      expect(data.capabilities).toContain('resources');
      expect(data.tools).toContain('search_libraries');
      expect(data.tools).toContain('get_library_details');

      console.log('✅ MCP Server: サーバー情報を取得');
    });

    test('MCP Server tools/listが動作する', async ({ request }) => {
      const response = await request.post('/api/mcp', {
        data: {
          jsonrpc: '2.0',
          method: 'tools/list',
          id: 1,
        },
      });

      expect(response.ok()).toBeTruthy();

      const data = await response.json();

      expect(data.jsonrpc).toBe('2.0');
      expect(data.result.tools).toBeDefined();
      expect(Array.isArray(data.result.tools)).toBe(true);

      const toolNames = data.result.tools.map((t: { name: string }) => t.name);
      expect(toolNames).toContain('search_libraries');
      expect(toolNames).toContain('get_library_details');

      console.log(`✅ MCP tools/list: ${data.result.tools.length}ツールを取得`);
    });

    test('MCP Server search_librariesツールが動作する', async ({ request }) => {
      const response = await request.post('/api/mcp', {
        data: {
          jsonrpc: '2.0',
          method: 'tools/call',
          params: {
            name: 'search_libraries',
            arguments: {
              query: 'OAuth',
              limit: 3,
            },
          },
          id: 2,
        },
      });

      expect(response.ok()).toBeTruthy();

      const data = await response.json();

      expect(data.jsonrpc).toBe('2.0');
      expect(data.result.content).toBeDefined();
      expect(data.result.content[0].type).toBe('text');

      const searchResult = JSON.parse(data.result.content[0].text);
      expect(searchResult.libraries).toBeDefined();

      console.log(`✅ MCP search_libraries: ${searchResult.libraries.length}件を取得`);
    });

    test('MCP Server resources/listが動作する', async ({ request }) => {
      const response = await request.post('/api/mcp', {
        data: {
          jsonrpc: '2.0',
          method: 'resources/list',
          id: 3,
        },
      });

      expect(response.ok()).toBeTruthy();

      const data = await response.json();

      expect(data.jsonrpc).toBe('2.0');
      expect(data.result.resources).toBeDefined();
      expect(Array.isArray(data.result.resources)).toBe(true);

      console.log(`✅ MCP resources/list: ${data.result.resources.length}リソースを取得`);
    });

    test('MCP Serverで未知のメソッドがエラーを返す', async ({ request }) => {
      const response = await request.post('/api/mcp', {
        data: {
          jsonrpc: '2.0',
          method: 'unknown/method',
          id: 4,
        },
      });

      expect(response.status()).toBe(400);

      const data = await response.json();

      expect(data.error).toBeDefined();
      expect(data.error.code).toBe(-32601);

      console.log('✅ MCP未知メソッド: エラーを返却');
    });
  });
});
