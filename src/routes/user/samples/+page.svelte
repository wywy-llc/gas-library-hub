<script lang="ts">
  import {
    sample_list_title,
    sample_no_samples,
    sample_no_samples_description,
    sample_create_first,
    sample_sort_newest,
    sample_sort_popular,
    sample_sort_most_copied,
  } from '$lib/paraglide/messages.js';
  import SampleCard from '$lib/components/sample/SampleCard.svelte';
  import Pagination from '$lib/components/Pagination.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  let likedSet = $derived(new Set(data.likedSampleIds));

  function handleSortChange(e: Event) {
    const select = e.target as HTMLSelectElement;
    const url = new URL(window.location.href);
    url.searchParams.set('orderBy', select.value);
    url.searchParams.set('page', '1');
    window.location.href = url.toString();
  }
</script>

<svelte:head>
  <title>{sample_list_title()}</title>
</svelte:head>

<main class="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
  <!-- ヘッダー部分: タイトルとアクション -->
  <header class="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <h1 class="text-2xl font-bold sm:text-3xl">{sample_list_title()}</h1>

    <div class="flex items-center gap-3">
      <!-- ソート選択: daisyUI v5 select -->
      <label class="sr-only" for="sort-select">ソート順</label>
      <select
        id="sort-select"
        class="select select-sm"
        value={data.orderBy}
        onchange={handleSortChange}
        aria-label="ソート順を選択"
      >
        <option value="createdAt">{sample_sort_newest()}</option>
        <option value="likeCount">{sample_sort_popular()}</option>
        <option value="copyCount">{sample_sort_most_copied()}</option>
      </select>

      <!-- 作成ボタン: プライマリアクションはソリッド -->
      <a href="/user/samples/new" class="btn btn-primary btn-sm" aria-label={sample_create_first()}>
        + {sample_create_first()}
      </a>
    </div>
  </header>

  {#if data.samples.length === 0}
    <!-- 空状態: daisyUI heroコンポーネント -->
    <div class="hero rounded-box bg-base-200 min-h-[60vh]">
      <div class="hero-content text-center">
        <div class="max-w-md">
          <h2 class="text-base-content/80 text-2xl font-semibold">
            {sample_no_samples()}
          </h2>
          <p class="text-base-content/60 py-6">
            {sample_no_samples_description()}
          </p>
          <a href="/user/samples/new" class="btn btn-primary" aria-label={sample_create_first()}>
            {sample_create_first()}
          </a>
        </div>
      </div>
    </div>
  {:else}
    <!-- サンプル一覧グリッド -->
    <div
      class="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
      role="list"
      aria-label="サンプルコード一覧"
    >
      {#each data.samples as sample (sample.id)}
        <article role="listitem">
          <SampleCard {sample} liked={likedSet.has(sample.id)} />
        </article>
      {/each}
    </div>

    <!-- ページネーション -->
    {#if data.pagination.totalPages > 1}
      <nav class="mt-10" aria-label="ページナビゲーション">
        <Pagination
          currentPage={data.pagination.page}
          totalPages={data.pagination.totalPages}
          getPageUrl={page => `/user/samples?page=${page}&orderBy=${data.orderBy}`}
        />
      </nav>
    {/if}
  {/if}
</main>
