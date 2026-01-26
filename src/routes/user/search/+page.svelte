<script lang="ts">
  import LibraryCard from '$lib/components/LibraryCard.svelte';
  import Pagination from '$lib/components/Pagination.svelte';
  import SearchBox from '$lib/components/SearchBox.svelte';
  import SeoHead from '$lib/components/SeoHead.svelte';
  import { APP_CONFIG, createFullUrl, getLogoUrl } from '$lib/constants/app-config.js';
  import {
    all_libraries_count,
    library_sort_most_copied,
    library_sort_newest,
    library_sort_stars,
    meta_keywords_home,
    no_search_results,
    search_from_box,
    search_gas_libraries,
    search_results_for,
    try_different_keywords,
  } from '$lib/paraglide/messages.js';
  import { generateHreflangLinks } from '$lib/utils/seo.js';
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
    if (data.orderBy && data.orderBy !== 'starCount') params.set('orderBy', data.orderBy);
    if (data.currentPage > 1) params.set('page', data.currentPage.toString());
    const queryString = params.toString();
    return createFullUrl(`/user/search${queryString ? `?${queryString}` : ''}`);
  });

  const prevPageUrl = $derived(data.currentPage > 1 ? getPageUrl(data.currentPage - 1) : '');

  const nextPageUrl = $derived(
    data.currentPage < totalPages ? getPageUrl(data.currentPage + 1) : ''
  );

  // hreflangはベースパス（クエリパラメータなし）で生成
  const hreflangLinks = generateHreflangLinks('/user/search');
  const logoUrl = getLogoUrl();

  // ページURL生成関数
  function getPageUrl(pageNum: number): string {
    const params = new SvelteURLSearchParams();
    if (data.searchQuery) params.set('q', data.searchQuery);
    if (data.scriptType) params.set('scriptType', data.scriptType);
    if (data.orderBy && data.orderBy !== 'starCount') params.set('orderBy', data.orderBy);
    if (pageNum > 1) params.set('page', pageNum.toString());
    const queryString = params.toString();
    return `/user/search${queryString ? `?${queryString}` : ''}`;
  }

  // ソート変更ハンドラー
  function handleSortChange(e: Event) {
    const select = e.target as HTMLSelectElement;
    const params = new SvelteURLSearchParams();
    if (data.searchQuery) params.set('q', data.searchQuery);
    if (data.scriptType) params.set('scriptType', data.scriptType);
    if (select.value !== 'starCount') params.set('orderBy', select.value);
    params.set('page', '1');
    const queryString = params.toString();
    window.location.href = `/user/search${queryString ? `?${queryString}` : ''}`;
  }
</script>

<SeoHead
  title={pageTitle}
  description={pageDescription}
  keywords={meta_keywords_home()}
  canonical={currentUrl}
  ogUrl={currentUrl}
  ogImage={logoUrl}
  ogSiteName={APP_CONFIG.SITE_NAME}
  {hreflangLinks}
/>

<!-- Pagination Meta Tags -->
<svelte:head>
  {#if data.currentPage > 1}
    <link rel="prev" href={prevPageUrl} />
  {/if}
  {#if data.currentPage < totalPages}
    <link rel="next" href={nextPageUrl} />
  {/if}
</svelte:head>

<main class="bg-base-200 min-h-screen">
  <div class="container mx-auto px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
    <!-- 検索バー -->
    <div class="mx-auto mb-4 max-w-xl sm:mb-6">
      <SearchBox placeholder={search_gas_libraries()} value={data.searchQuery} />
    </div>

    <!-- ヘッダー部分: タイトルとアクション -->
    <header
      class="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
    >
      {#if data.searchQuery}
        <h1 class="text-xl font-bold sm:text-2xl lg:text-3xl">
          {search_results_for({ query: data.searchQuery, count: data.totalResults })}
        </h1>
      {:else}
        <h1 class="text-xl font-bold sm:text-2xl lg:text-3xl">
          {all_libraries_count({ count: data.totalResults })}
        </h1>
      {/if}

      <div class="flex shrink-0 items-center gap-3">
        <!-- ソート選択: daisyUI v5 select -->
        <label class="sr-only" for="sort-select">ソート順</label>
        <select
          id="sort-select"
          class="select select-sm w-full sm:w-auto"
          value={data.orderBy}
          onchange={handleSortChange}
          aria-label="ソート順を選択"
        >
          <option value="starCount">{library_sort_stars()}</option>
          <option value="createdAt">{library_sort_newest()}</option>
          <option value="copyCount">{library_sort_most_copied()}</option>
        </select>
      </div>
    </header>

    <!-- ライブラリリスト -->
    {#if data.libraries.length > 0}
      <section
        class="mx-auto max-w-3xl space-y-4 sm:space-y-6"
        role="list"
        aria-label="検索結果ライブラリ一覧"
      >
        {#each data.libraries as library (library.id)}
          <article role="listitem">
            <LibraryCard {library} librarySummary={library.librarySummary} />
          </article>
        {/each}
      </section>

      <!-- ページネーション -->
      {#if totalPages > 1}
        <nav class="mx-auto mt-8 max-w-3xl sm:mt-10" aria-label="ページナビゲーション">
          <Pagination currentPage={data.currentPage} {totalPages} {getPageUrl} />
        </nav>
      {/if}
    {:else}
      <!-- 検索結果なし: daisyUI heroコンポーネント -->
      <div
        class="hero rounded-box bg-base-100 mx-auto min-h-[50vh] max-w-3xl px-4 shadow-sm sm:min-h-[60vh]"
      >
        <div class="hero-content text-center">
          <div class="max-w-md">
            <svg
              class="mx-auto h-10 w-10 opacity-40 sm:h-12 sm:w-12"
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
            <h2 class="text-base-content/80 mt-3 text-xl font-semibold sm:mt-4 sm:text-2xl">
              {data.searchQuery ? no_search_results() : search_gas_libraries()}
            </h2>
            <p class="text-base-content/60 py-4 text-sm sm:py-6 sm:text-base">
              {data.searchQuery ? try_different_keywords() : search_from_box()}
            </p>
          </div>
        </div>
      </div>
    {/if}
  </div>
</main>
