<script lang="ts">
  import TagButton from '$lib/components/TagButton.svelte';
  import {
    edit,
    sample_copy_button,
    sample_copy_count,
    sample_detail_title,
    sample_like_button,
    sample_like_count,
    sample_liked_button,
    sample_posted_at,
    sample_posted_by,
    sample_view_count,
  } from '$lib/paraglide/messages.js';
  import { getLocale } from '$lib/paraglide/runtime.js';
  import { getDocumentTypeIcon, getDocumentTypeLabel } from '$lib/utils/document-type-util.js';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  let liked = $state(data.liked);
  let likeCount = $state(data.sample.likeCount);
  let copyCount = $state(data.sample.copyCount);
  let currentLocale = $derived(getLocale());

  let formattedDate = $derived(
    currentLocale === 'ja'
      ? new Date(data.sample.createdAt).toLocaleDateString('ja-JP')
      : new Date(data.sample.createdAt).toLocaleDateString('en-US')
  );

  async function handleLike() {
    try {
      const res = await fetch(`/user/samples/${data.sample.id}/like`, {
        method: 'POST',
      });
      if (res.ok) {
        const result = await res.json();
        liked = result.liked;
        likeCount = result.likeCount;
      }
    } catch (e) {
      console.error('Like failed:', e);
    }
  }

  async function handleCopy() {
    try {
      const res = await fetch(`/user/samples/${data.sample.id}/copy`, {
        method: 'POST',
      });
      if (res.ok) {
        const result = await res.json();
        copyCount = result.copyCount;
      }
    } catch (e) {
      console.error('Copy record failed:', e);
    }
  }
</script>

<svelte:head>
  <title>{data.sample.title} - {sample_detail_title()}</title>
</svelte:head>

<div class="container mx-auto max-w-4xl px-4 py-8">
  <article class="bg-base-100 rounded-box border-base-200 border p-6">
    <header class="mb-6">
      <div class="mb-4 flex items-start justify-between">
        <div class="flex items-center gap-2">
          <span class="text-2xl">{getDocumentTypeIcon(data.sample.documentType)}</span>
          <span class="badge badge-outline">{getDocumentTypeLabel(data.sample.documentType)}</span>
        </div>
        {#if data.isOwner}
          <a href="/user/samples/{data.sample.id}/edit" class="btn btn-outline btn-sm">
            {edit()}
          </a>
        {/if}
      </div>

      <h1 class="mb-2 text-2xl font-bold">{data.sample.title}</h1>

      <div class="text-base-content/60 flex items-center gap-4 text-sm">
        {#if data.author}
          <span>
            {sample_posted_by()}:
            <a href="/user/profile/{data.author.id}" class="link link-hover">
              {data.author.name}
            </a>
          </span>
        {/if}
        <span>{sample_posted_at()}: {formattedDate}</span>
      </div>
    </header>

    <div class="prose mb-6 max-w-none">
      <p class="whitespace-pre-wrap">{data.sample.description}</p>
    </div>

    {#if data.sample.tags && data.sample.tags.length > 0}
      <div class="mb-6 flex flex-wrap gap-2">
        {#each data.sample.tags as tag}
          <TagButton size="sm">{tag}</TagButton>
        {/each}
      </div>
    {/if}

    <div class="border-base-200 flex items-center justify-between border-t pt-6">
      <div class="text-base-content/60 flex items-center gap-4 text-sm">
        <span title={sample_view_count({ count: data.sample.viewCount.toString() })}>
          👁️ {data.sample.viewCount}
        </span>
        <span title={sample_copy_count({ count: copyCount.toString() })}>📋 {copyCount}</span>
        <span title={sample_like_count({ count: likeCount.toString() })}>❤️ {likeCount}</span>
      </div>

      <div class="flex items-center gap-3">
        <button
          type="button"
          class="btn btn-ghost"
          class:text-error={liked}
          onclick={handleLike}
          title={liked ? sample_liked_button() : sample_like_button()}
        >
          {liked ? '❤️' : '🤍'}
          <span>{likeCount}</span>
        </button>
        <a
          href={data.sample.copyUrl}
          target="_blank"
          rel="noopener noreferrer"
          class="btn btn-primary"
          onclick={handleCopy}
        >
          📋 {sample_copy_button()}
        </a>
      </div>
    </div>
  </article>
</div>
