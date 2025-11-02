<script lang="ts">
  import LibraryCard from '$lib/components/LibraryCard.svelte';
  import Pagination from '$lib/components/Pagination.svelte';
  import SearchBox from '$lib/components/SearchBox.svelte';
  import { createFullUrl, getLogoUrl } from '$lib/constants/app-config.js';
  import {
    all_libraries_count,
    meta_keywords_home,
    no_search_results,
    search_from_box,
    search_gas_libraries,
    search_results_for,
    try_different_keywords,
  } from '$lib/paraglide/messages.js';
  import { SvelteURLSearchParams } from 'svelte/reactivity';
  import type { PageData } from './$types.js';

  // 検索結果ページコンポーネント
  // GASライブラリの検索結果を表示し、ページネーション機能を提供

  let { data } = $props<{ data: PageData }>();

  // 結果件数に基づいてページ数を動的に計算
  const totalPages = $derived(Math.ceil(data.totalResults / data.itemsPerPage));

  // SEO用のmeta情報を動的に生成
  const pageTitle = $derived(
    data.searchQuery
      ? `${search_results_for({ query: data.searchQuery, count: data.totalResults })} - GAS Library Hub`
      : `${all_libraries_count({ count: data.totalResults })} - GAS Library Hub`
  );

  const pageDescription = $derived(
    data.searchQuery
      ? `"${data.searchQuery}"の検索結果を表示中。${data.totalResults}件のGoogle Apps Scriptライブラリが見つかりました。`
      : `Google Apps Scriptライブラリの一覧。${data.totalResults}件の便利なライブラリを検索できます。`
  );

  const currentUrl = $derived.by(() => {
    const params = new SvelteURLSearchParams();
    if (data.searchQuery) params.set('q', data.searchQuery);
    if (data.scriptType) params.set('scriptType', data.scriptType);
    if (data.currentPage > 1) params.set('page', data.currentPage.toString());
    const queryString = params.toString();
    return createFullUrl(`/user/search${queryString ? `?${queryString}` : ''}`);
  });

  const prevPageUrl = $derived(data.currentPage > 1 ? getPageUrl(data.currentPage - 1) : '');

  const nextPageUrl = $derived(
    data.currentPage < totalPages ? getPageUrl(data.currentPage + 1) : ''
  );

  // ページURL生成関数
  function getPageUrl(pageNum: number): string {
    const params = new SvelteURLSearchParams();
    if (data.searchQuery) params.set('q', data.searchQuery);
    if (data.scriptType) params.set('scriptType', data.scriptType);
    if (pageNum > 1) params.set('page', pageNum.toString());
    const queryString = params.toString();
    return `/user/search${queryString ? `?${queryString}` : ''}`;
  }
</script>

<svelte:head>
  <title>{pageTitle}</title>
  <meta name="description" content={pageDescription} />
  <meta name="keywords" content={meta_keywords_home()} />

  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website" />
  <meta property="og:url" content={currentUrl} />
  <meta property="og:title" content={pageTitle} />
  <meta property="og:description" content={pageDescription} />
  <meta property="og:image" content={getLogoUrl()} />
  <meta property="og:site_name" content="GAS Library Hub" />

  <!-- Twitter -->
  <meta property="twitter:card" content="summary_large_image" />
  <meta property="twitter:url" content={currentUrl} />
  <meta property="twitter:title" content={pageTitle} />
  <meta property="twitter:description" content={pageDescription} />
  <meta property="twitter:image" content={getLogoUrl()} />

  <!-- Additional SEO Meta Tags -->
  <link rel="canonical" href={currentUrl} />

  <!-- Pagination Meta Tags -->
  {#if data.currentPage > 1}
    <link rel="prev" href={prevPageUrl} />
  {/if}
  {#if data.currentPage < totalPages}
    <link rel="next" href={nextPageUrl} />
  {/if}
</svelte:head>

<main class="container mx-auto px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
  <!-- 検索バーと結果件数 -->
  <header class="mb-8">
    <div class="mx-auto mb-6 max-w-xl">
      <SearchBox placeholder={search_gas_libraries()} value={data.searchQuery} />
    </div>
    {#if data.searchQuery}
      <h1 class="text-center text-2xl font-bold text-gray-800">
        {search_results_for({ query: data.searchQuery, count: data.totalResults })}
      </h1>
    {:else}
      <h1 class="text-center text-2xl font-bold text-gray-800">
        {all_libraries_count({ count: data.totalResults })}
      </h1>
    {/if}
  </header>

  <!-- ライブラリリスト -->
  {#if data.libraries.length > 0}
    <section class="mx-auto max-w-3xl space-y-6" aria-label="検索結果ライブラリ一覧">
      {#each data.libraries as library (library.id)}
        <article>
          <LibraryCard {library} librarySummary={library.librarySummary} />
        </article>
      {/each}
    </section>

    <!-- ページネーション -->
    <div class="mx-auto mt-12 max-w-3xl">
      <Pagination currentPage={data.currentPage} {totalPages} {getPageUrl} />
    </div>
  {:else}
    <section class="mx-auto max-w-3xl py-12 text-center" aria-label="検索結果なし">
      <svg
        class="mx-auto h-12 w-12 text-gray-400"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke-width="1.5"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
        />
      </svg>
      <h2 class="mt-4 text-lg font-medium text-gray-900">
        {data.searchQuery ? no_search_results() : search_gas_libraries()}
      </h2>
      <p class="mt-2 text-gray-500">
        {data.searchQuery ? try_different_keywords() : search_from_box()}
      </p>
    </section>
  {/if}
</main>
