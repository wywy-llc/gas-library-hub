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

<div class="container mx-auto px-4 py-8">
  <div class="mb-6 flex items-center justify-between">
    <h1 class="text-2xl font-bold">{sample_list_title()}</h1>

    <div class="flex items-center gap-4">
      <select
        class="select select-bordered select-sm"
        value={data.orderBy}
        onchange={handleSortChange}
      >
        <option value="createdAt">{sample_sort_newest()}</option>
        <option value="likeCount">{sample_sort_popular()}</option>
        <option value="copyCount">{sample_sort_most_copied()}</option>
      </select>

      <a href="/user/samples/new" class="btn btn-primary btn-sm">
        + {sample_create_first()}
      </a>
    </div>
  </div>

  {#if data.samples.length === 0}
    <div class="py-16 text-center">
      <p class="text-base-content/60 mb-2 text-lg">{sample_no_samples()}</p>
      <p class="text-base-content/40 mb-6 text-sm">{sample_no_samples_description()}</p>
      <a href="/user/samples/new" class="btn btn-primary">
        {sample_create_first()}
      </a>
    </div>
  {:else}
    <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {#each data.samples as sample (sample.id)}
        <SampleCard {sample} liked={likedSet.has(sample.id)} />
      {/each}
    </div>

    {#if data.pagination.totalPages > 1}
      <div class="mt-8">
        <Pagination
          currentPage={data.pagination.page}
          totalPages={data.pagination.totalPages}
          getPageUrl={page => `/user/samples?page=${page}&orderBy=${data.orderBy}`}
        />
      </div>
    {/if}
  {/if}
</div>
