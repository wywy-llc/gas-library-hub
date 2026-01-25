<script lang="ts">
  import {
    profile_public_title,
    profile_samples_count,
    profile_total_copies,
    profile_total_likes,
    profile_member_since,
    sample_no_samples,
  } from '$lib/paraglide/messages.js';
  import { getLocale } from '$lib/paraglide/runtime.js';
  import SampleCard from '$lib/components/sample/SampleCard.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  let currentLocale = $derived(getLocale());

  let memberSince = $derived(
    currentLocale === 'ja'
      ? new Date(data.profileUser.createdAt).toLocaleDateString('ja-JP', {
          year: 'numeric',
          month: 'long',
        })
      : new Date(data.profileUser.createdAt).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
        })
  );
</script>

<svelte:head>
  <title>{data.profileUser.name} - {profile_public_title()}</title>
</svelte:head>

<div class="container mx-auto px-4 py-8">
  <div class="mb-8 flex items-start gap-6">
    {#if data.profileUser.picture}
      <img
        src={data.profileUser.picture}
        alt={data.profileUser.name}
        class="h-20 w-20 rounded-full"
      />
    {:else}
      <div
        class="bg-base-300 flex h-20 w-20 items-center justify-center rounded-full text-3xl font-bold"
      >
        {data.profileUser.name.charAt(0).toUpperCase()}
      </div>
    {/if}

    <div class="flex-1">
      <h1 class="mb-2 text-2xl font-bold">{data.profileUser.name}</h1>
      <div class="text-base-content/60 mb-4 flex flex-wrap items-center gap-4 text-sm">
        <span>{profile_samples_count({ count: data.stats.totalSamples.toString() })}</span>
        <span>{profile_total_copies({ count: data.stats.totalCopies.toString() })}</span>
        <span>{profile_total_likes({ count: data.stats.totalLikes.toString() })}</span>
      </div>
      <p class="text-base-content/60 text-sm">
        {profile_member_since()}: {memberSince}
      </p>
    </div>
  </div>

  {#if data.samples.length === 0}
    <div class="py-16 text-center">
      <p class="text-base-content/60 text-lg">{sample_no_samples()}</p>
    </div>
  {:else}
    <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {#each data.samples as sample (sample.id)}
        <SampleCard {sample} />
      {/each}
    </div>
  {/if}
</div>
