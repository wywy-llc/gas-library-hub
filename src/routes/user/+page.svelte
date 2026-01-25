<script lang="ts">
  import LibraryCard from '$lib/components/LibraryCard.svelte';
  import SampleCard from '$lib/components/sample/SampleCard.svelte';
  import SearchBox from '$lib/components/SearchBox.svelte';
  import SeoHead from '$lib/components/SeoHead.svelte';
  import { APP_CONFIG, createAppUrl, getLogoUrl } from '$lib/constants/app-config.js';
  import {
    featured_libraries,
    featured_samples,
    gas_library_search,
    meta_description_home,
    meta_keywords_home,
    meta_title_home,
    view_all_libraries,
    view_all_samples,
    welcome_user,
  } from '$lib/paraglide/messages.js';
  import { generateHreflangLinks } from '$lib/utils/seo.js';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const pagePath = '/user';
  const pageUrl = createAppUrl(pagePath);
  const logoUrl = getLogoUrl();
  const hreflangLinks = generateHreflangLinks(pagePath);

  let likedSet = $derived(new Set(data.likedSampleIds));
</script>

<SeoHead
  title={meta_title_home()}
  description={meta_description_home()}
  keywords={meta_keywords_home()}
  canonical={pageUrl}
  author="wywy LLC"
  ogUrl={pageUrl}
  ogImage={logoUrl}
  ogSiteName={APP_CONFIG.SITE_NAME}
  {hreflangLinks}
/>

<!-- GASライブラリ検索ヘッダー -  Hero -->
<div class="hero bg-base-200 py-12">
  <div class="hero-content w-full max-w-4xl text-center">
    <div class="w-full">
      <h1 class="text-3xl font-bold">{gas_library_search()}</h1>
      {#if data.session?.user}
        <p class="mt-4 text-lg">
          {welcome_user({ userName: data.session.user.name || data.session.user.email || '' })}
        </p>
      {/if}
      <div class="mx-auto mt-8 max-w-xl" role="search">
        <SearchBox />
      </div>
    </div>
  </div>
</div>

<!-- 注目のライブラリセクション -->
<section class="bg-base-100 py-8">
  <div class="container mx-auto px-4 sm:px-6 lg:px-8">
    <header class="mb-12 text-center">
      <h2 class="text-3xl font-bold sm:text-4xl">
        {featured_libraries()}
      </h2>
    </header>

    <div
      class="grid gap-8 md:grid-cols-2 lg:grid-cols-3"
      role="list"
      aria-label="注目のライブラリ一覧"
    >
      {#each data.featuredLibraries as library (library.id)}
        <article role="listitem">
          <LibraryCard {library} librarySummary={library.librarySummary} />
        </article>
      {/each}
    </div>

    <footer class="mt-16 text-center">
      <a href="/user/search?scriptType=library" class="btn btn-outline btn-lg">
        {view_all_libraries()}
      </a>
    </footer>
  </div>
</section>

<!-- 注目のサンプルコードセクション -->
{#if data.featuredSamples.length > 0}
  <section class="bg-base-200 py-8">
    <div class="container mx-auto px-4 sm:px-6 lg:px-8">
      <header class="mb-12 text-center">
        <h2 class="text-3xl font-bold sm:text-4xl">
          {featured_samples()}
        </h2>
      </header>

      <div
        class="grid gap-8 md:grid-cols-2 lg:grid-cols-3"
        role="list"
        aria-label="注目のサンプルコード一覧"
      >
        {#each data.featuredSamples as sample (sample.id)}
          <article role="listitem">
            <SampleCard {sample} liked={likedSet.has(sample.id)} />
          </article>
        {/each}
      </div>

      <footer class="mt-16 text-center">
        <a href="/user/samples" class="btn btn-outline btn-lg">
          {view_all_samples()}
        </a>
      </footer>
    </div>
  </section>
{/if}
