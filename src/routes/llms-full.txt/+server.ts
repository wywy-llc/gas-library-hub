import { APP_CONFIG } from '$lib/constants/app-config.js';
import { SearchLibrariesApiService } from '$lib/server/services/search-libraries-api-service.js';
import { API_CACHE_HEADERS } from '$lib/types/api-response.js';

/**
 * llms-full.txt エンドポイント
 * 全公開ライブラリのMarkdown形式一覧を提供
 */
export async function GET() {
  // 公開済みライブラリを取得（スター数順、最大1000件）
  const result = await SearchLibrariesApiService.call({
    limit: 100,
    sort: 'stars',
    order: 'desc',
    locale: 'ja',
  });

  const libraries = result.data.libraries;

  // Markdown形式で生成
  const header = `# ${APP_CONFIG.SITE_NAME} - Library Catalog

> Total: ${result.data.pagination.total} libraries
> Last updated: ${new Date().toISOString()}

---

`;

  const libraryEntries = libraries.map(lib => {
    const tagsStr = lib.tags.length > 0 ? lib.tags.join(', ') : 'N/A';

    return `## ${lib.name}

- **ID**: ${lib.id}
- **Script ID**: ${lib.scriptId}
- **Type**: ${lib.scriptType}
- **Author**: ${lib.authorName ?? 'Unknown'}
- **Stars**: ${lib.starCount}
- **Repository**: ${lib.repositoryUrl}
- **API**: ${APP_CONFIG.BASE_URL}/api/libraries/${lib.id}
- **Tags**: ${tagsStr}

${lib.purpose ?? lib.description ?? 'No description available.'}

---
`;
  });

  const content = header + libraryEntries.join('\n');

  return new Response(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      ...API_CACHE_HEADERS.LONG,
    },
  });
}
