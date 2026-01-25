<script lang="ts">
  import TagButton from '$lib/components/TagButton.svelte';
  import {
    sample_copy_button,
    sample_copy_button_tooltip,
    sample_copy_count,
    sample_like_button,
    sample_like_count,
    sample_liked_button,
    sample_view_count,
  } from '$lib/paraglide/messages.js';
  import { getLocale } from '$lib/paraglide/runtime.js';
  import type { SampleCode } from '$lib/server/db/schema.js';
  import { getDocumentTypeIcon, getDocumentTypeLabel } from '$lib/utils/document-type-util.js';

  interface Props {
    sample: SampleCode;
    liked?: boolean;
    onLike?: () => void;
    onCopy?: () => void;
  }

  let { sample, liked = false, onLike, onCopy }: Props = $props();

  let currentLocale = $derived(getLocale());

  let formattedDate = $derived(
    currentLocale === 'ja'
      ? new Date(sample.createdAt).toLocaleDateString('ja-JP')
      : new Date(sample.createdAt).toLocaleDateString('en-US')
  );

  let displayTags = $derived((sample.tags ?? []).slice(0, 3));
</script>

<article class="card card-border bg-base-100 shadow-sm transition-shadow hover:shadow-md">
  <div class="card-body gap-3 p-4">
    <!-- ヘッダー: ドキュメントタイプ + 日付 -->
    <header class="flex items-center justify-between gap-2">
      <div class="flex items-center gap-2">
        <span class="text-xl" role="img" aria-label={getDocumentTypeLabel(sample.documentType)}>
          {getDocumentTypeIcon(sample.documentType)}
        </span>
        <span class="badge badge-outline badge-sm">
          {getDocumentTypeLabel(sample.documentType)}
        </span>
      </div>
      <time class="text-base-content/60 text-xs" datetime={sample.createdAt.toISOString()}>
        {formattedDate}
      </time>
    </header>

    <!-- タイトル（リンク） -->
    <a href="/user/samples/{sample.id}" class="group">
      <h3 class="card-title line-clamp-2 text-base group-hover:underline">{sample.title}</h3>
    </a>

    <!-- 説明文 -->
    <p class="text-base-content/70 line-clamp-2 text-sm">{sample.description}</p>

    <!-- タグ -->
    {#if displayTags.length > 0}
      <div class="flex flex-wrap gap-1" role="list" aria-label="Tags">
        {#each displayTags as tag (tag)}
          <div role="listitem">
            <TagButton size="xs">{tag}</TagButton>
          </div>
        {/each}
      </div>
    {/if}

    <!-- フッター: 統計 + アクションボタン -->
    <footer class="border-base-200 mt-auto flex items-center justify-between border-t pt-3">
      <!-- 統計情報 -->
      <div class="text-base-content/60 flex items-center gap-3 text-xs" aria-label="Statistics">
        <span aria-label={sample_view_count({ count: sample.viewCount.toString() })}>
          <svg
            class="inline-block h-3.5 w-3.5 opacity-70"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            ></path>
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            ></path>
          </svg>
          {sample.viewCount}
        </span>
        <span aria-label={sample_copy_count({ count: sample.copyCount.toString() })}>
          <svg
            class="inline-block h-3.5 w-3.5 opacity-70"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            ></path>
          </svg>
          {sample.copyCount}
        </span>
        <span aria-label={sample_like_count({ count: sample.likeCount.toString() })}>
          <svg
            class="inline-block h-3.5 w-3.5 opacity-70"
            fill="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
            ></path>
          </svg>
          {sample.likeCount}
        </span>
      </div>

      <!-- アクションボタン -->
      <div class="flex items-center gap-1">
        <button
          type="button"
          class="btn btn-ghost btn-xs"
          class:text-error={liked}
          onclick={onLike}
          aria-label={liked ? sample_liked_button() : sample_like_button()}
          aria-pressed={liked}
        >
          {#if liked}
            <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
              ></path>
            </svg>
          {:else}
            <svg
              class="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              ></path>
            </svg>
          {/if}
        </button>
        <a
          href={sample.copyUrl}
          target="_blank"
          rel="noopener noreferrer"
          class="btn btn-primary btn-xs"
          onclick={onCopy}
          title={sample_copy_button_tooltip()}
          aria-label={sample_copy_button_tooltip()}
        >
          <svg
            class="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            ></path>
          </svg>
          {sample_copy_button()}
        </a>
      </div>
    </footer>
  </div>
</article>
