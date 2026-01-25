<script lang="ts">
  import MarkdownRenderer from '$lib/components/MarkdownRenderer.svelte';
  import TagButton from '$lib/components/TagButton.svelte';
  import {
    edit,
    sample_copy_button,
    sample_copy_card_description,
    sample_copy_card_title,
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

  // ユーザーアクションで変更される状態
  // $derived.by を使用してdataの変更を追跡しつつ、ローカル状態も保持
  let likedOverride = $state<boolean | null>(null);
  let likeCountOverride = $state<number | null>(null);
  let copyCountOverride = $state<number | null>(null);

  let liked = $derived(likedOverride ?? data.liked);
  let likeCount = $derived(likeCountOverride ?? data.sample.likeCount);
  let copyCount = $derived(copyCountOverride ?? data.sample.copyCount);

  // dataが変更された場合（ページ遷移など）にオーバーライドをリセット
  $effect(() => {
    // dataの変更を監視
    void data.sample.id;
    likedOverride = null;
    likeCountOverride = null;
    copyCountOverride = null;
  });

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
        likedOverride = result.liked;
        likeCountOverride = result.likeCount;
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
        copyCountOverride = result.copyCount;
      }
    } catch (e) {
      console.error('Copy record failed:', e);
    }
  }
</script>

<svelte:head>
  <title>{data.sample.title} - {sample_detail_title()}</title>
</svelte:head>

<main class="container mx-auto max-w-4xl px-4 py-8">
  <article class="card bg-base-100 shadow-sm">
    <div class="card-body">
      <!-- Header Section -->
      <header class="flex flex-col gap-4">
        <div class="flex items-start justify-between">
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-2xl" role="img" aria-hidden="true">
              {getDocumentTypeIcon(data.sample.documentType)}
            </span>
            <span class="badge badge-outline">
              {getDocumentTypeLabel(data.sample.documentType)}
            </span>
            {#if data.relatedLibrary}
              <span class="text-base-content/40">|</span>
              <a
                href="/user/libraries/{data.relatedLibrary.id}"
                class="link link-hover link-primary flex items-center gap-1 text-sm"
              >
                <span role="img" aria-hidden="true">📚</span>
                {data.relatedLibrary.name}
              </a>
            {/if}
          </div>
          {#if data.isOwner}
            <a
              href="/user/samples/{data.sample.id}/edit"
              class="btn btn-outline btn-sm"
              aria-label="{edit()} {data.sample.title}"
            >
              {edit()}
            </a>
          {/if}
        </div>

        <h1 class="card-title text-2xl">{data.sample.title}</h1>

        <div class="text-base-content/60 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          {#if data.author}
            <span>
              {sample_posted_by()}:
              <a href="/user/profile/{data.author.id}" class="link link-hover link-primary">
                {data.author.name}
              </a>
            </span>
          {/if}
          <span>{sample_posted_at()}: {formattedDate}</span>
        </div>
      </header>

      <div class="divider"></div>

      <!-- Description Section -->
      <section aria-labelledby="description-heading">
        <h2 id="description-heading" class="sr-only">Description</h2>
        <MarkdownRenderer content={data.sample.description} />
      </section>

      <!-- Tags Section -->
      {#if data.sample.tags && data.sample.tags.length > 0}
        <section aria-labelledby="tags-heading" class="mt-4">
          <h2 id="tags-heading" class="sr-only">Tags</h2>
          <div class="flex flex-wrap gap-2">
            {#each data.sample.tags as tag (tag)}
              <TagButton size="sm">{tag}</TagButton>
            {/each}
          </div>
        </section>
      {/if}

      <div class="divider"></div>

      <!-- Statistics & Like Section -->
      <section
        aria-label="Statistics and engagement"
        class="flex flex-wrap items-center justify-between gap-4"
      >
        <!-- Statistics (compact) -->
        <div class="text-base-content/60 flex items-center gap-4 text-sm">
          <span title={sample_view_count({ count: data.sample.viewCount.toString() })}>
            👁️ {data.sample.viewCount}
          </span>
          <span title={sample_copy_count({ count: copyCount.toString() })}>
            📋 {copyCount}
          </span>
          <span title={sample_like_count({ count: likeCount.toString() })}>
            ❤️ {likeCount}
          </span>
        </div>

        <!-- Like button -->
        <button
          type="button"
          class="btn btn-ghost"
          class:text-error={liked}
          onclick={handleLike}
          aria-label={liked ? sample_liked_button() : sample_like_button()}
          aria-pressed={liked}
        >
          {liked ? '❤️' : '🤍'}
          <span>{likeCount}</span>
        </button>
      </section>

      <div class="divider"></div>

      <!-- Copy Action Card Section -->
      <section aria-labelledby="copy-action-heading">
        <div class="card card-border bg-base-200">
          <div class="card-body flex-row flex-wrap items-center justify-between gap-4 p-4">
            <div class="flex-1">
              <h3 id="copy-action-heading" class="card-title text-base">
                {sample_copy_card_title()}
              </h3>
              <p class="text-base-content/60 text-sm">
                {sample_copy_card_description()}
              </p>
            </div>
            <a
              href={data.sample.copyUrl}
              target="_blank"
              rel="noopener noreferrer"
              class="btn btn-primary"
              onclick={handleCopy}
              aria-describedby="copy-action-heading"
            >
              📋 {sample_copy_button()}
            </a>
          </div>
        </div>
      </section>
    </div>
  </article>
</main>
