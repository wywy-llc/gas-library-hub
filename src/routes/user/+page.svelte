<script lang="ts">
  import Button from '$lib/components/Button.svelte';
  import LibraryCard from '$lib/components/LibraryCard.svelte';
  import SearchBox from '$lib/components/SearchBox.svelte';
  import { createAppUrl, getLogoUrl } from '$lib/constants/app-config.js';
  import {
    featured_libraries,
    featured_web_apps,
    gas_library_search,
    meta_description_home,
    meta_keywords_home,
    meta_title_home,
    view_all_libraries,
    view_all_web_apps,
    welcome_user,
  } from '$lib/paraglide/messages.js';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
</script>

<svelte:head>
  <title>{meta_title_home()}</title>
  <meta name="description" content={meta_description_home()} />
  <meta name="keywords" content={meta_keywords_home()} />

  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website" />
  <meta property="og:url" content={createAppUrl('/user')} />
  <meta property="og:title" content={meta_title_home()} />
  <meta property="og:description" content={meta_description_home()} />
  <meta property="og:image" content={getLogoUrl()} />

  <!-- Twitter -->
  <meta property="twitter:card" content="summary_large_image" />
  <meta property="twitter:url" content={createAppUrl('/user')} />
  <meta property="twitter:title" content={meta_title_home()} />
  <meta property="twitter:description" content={meta_description_home()} />
  <meta property="twitter:image" content={getLogoUrl()} />

  <!-- Additional SEO Meta Tags -->
  <meta name="author" content="wywy LLC" />
  <link rel="canonical" href={createAppUrl('/user')} />
</svelte:head>

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

<!-- 注目のライブラリセクション - 準拠 -->
<section class="bg-base-100 py-16 sm:py-24">
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
      <Button variant="outline" size="lg" href="/user/search?scriptType=library">
        {view_all_libraries()}
      </Button>
    </footer>
  </div>
</section>

<!-- 注目のWebアプリセクション - 準拠 -->
{#if data.featuredWebApps && data.featuredWebApps.length > 0}
  <section class="bg-base-200 py-16 sm:py-24">
    <div class="container mx-auto px-4 sm:px-6 lg:px-8">
      <header class="mb-12 text-center">
        <h2 class="text-3xl font-bold sm:text-4xl">
          {featured_web_apps()}
        </h2>
      </header>

      <div
        class="grid gap-8 md:grid-cols-2 lg:grid-cols-3"
        role="list"
        aria-label="注目のWebアプリ一覧"
      >
        {#each data.featuredWebApps as webApp (webApp.id)}
          <article role="listitem">
            <LibraryCard library={webApp} librarySummary={webApp.librarySummary} />
          </article>
        {/each}
      </div>

      <footer class="mt-16 text-center">
        <Button variant="outline" size="lg" href="/user/search?scriptType=web_app">
          {view_all_web_apps()}
        </Button>
      </footer>
    </div>
  </section>
{/if}
