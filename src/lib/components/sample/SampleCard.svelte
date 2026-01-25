<script lang="ts">
  import {
    sample_copy_count,
    sample_like_count,
    sample_view_count,
    sample_document_type_spreadsheet,
    sample_document_type_document,
    sample_document_type_slides,
    sample_document_type_apps_script,
    sample_copy_button,
    sample_like_button,
    sample_liked_button,
  } from '$lib/paraglide/messages.js';
  import { getLocale } from '$lib/paraglide/runtime.js';
  import type { SampleCode, DocumentType } from '$lib/server/db/schema.js';
  import TagButton from '$lib/components/TagButton.svelte';

  interface Props {
    sample: SampleCode;
    liked?: boolean;
    onLike?: () => void;
    onCopy?: () => void;
  }

  let { sample, liked = false, onLike, onCopy }: Props = $props();

  let currentLocale = $derived(getLocale());

  function getDocumentTypeLabel(type: DocumentType): string {
    switch (type) {
      case 'spreadsheet':
        return sample_document_type_spreadsheet();
      case 'document':
        return sample_document_type_document();
      case 'slides':
        return sample_document_type_slides();
      case 'apps_script':
        return sample_document_type_apps_script();
    }
  }

  function getDocumentTypeIcon(type: DocumentType): string {
    switch (type) {
      case 'spreadsheet':
        return '📊';
      case 'document':
        return '📄';
      case 'slides':
        return '📽️';
      case 'apps_script':
        return '⚡';
    }
  }

  let formattedDate = $derived(
    currentLocale === 'ja'
      ? new Date(sample.createdAt).toLocaleDateString('ja-JP')
      : new Date(sample.createdAt).toLocaleDateString('en-US')
  );

  let displayTags = $derived((sample.tags ?? []).slice(0, 3));
</script>

<article
  class="card bg-base-100 border-base-200 border shadow-sm transition-shadow hover:shadow-md"
>
  <div class="card-body p-4">
    <div class="flex items-start justify-between gap-2">
      <div class="flex items-center gap-2">
        <span class="text-xl" title={getDocumentTypeLabel(sample.documentType)}>
          {getDocumentTypeIcon(sample.documentType)}
        </span>
        <span class="badge badge-outline badge-sm">
          {getDocumentTypeLabel(sample.documentType)}
        </span>
      </div>
      <time class="text-base-content/60 text-xs">{formattedDate}</time>
    </div>

    <a href="/user/samples/{sample.id}" class="hover:underline">
      <h3 class="card-title line-clamp-2 text-base">{sample.title}</h3>
    </a>

    <p class="text-base-content/70 line-clamp-2 text-sm">{sample.description}</p>

    {#if displayTags.length > 0}
      <div class="flex flex-wrap gap-1">
        {#each displayTags as tag}
          <TagButton size="xs">{tag}</TagButton>
        {/each}
      </div>
    {/if}

    <div class="border-base-200 mt-2 flex items-center justify-between border-t pt-2">
      <div class="text-base-content/60 flex items-center gap-3 text-xs">
        <span title={sample_view_count({ count: sample.viewCount.toString() })}>
          👁️ {sample.viewCount}
        </span>
        <span title={sample_copy_count({ count: sample.copyCount.toString() })}>
          📋 {sample.copyCount}
        </span>
        <span title={sample_like_count({ count: sample.likeCount.toString() })}>
          ❤️ {sample.likeCount}
        </span>
      </div>

      <div class="flex items-center gap-2">
        <button
          type="button"
          class="btn btn-xs btn-ghost"
          class:text-error={liked}
          onclick={onLike}
          title={liked ? sample_liked_button() : sample_like_button()}
        >
          {liked ? '❤️' : '🤍'}
        </button>
        <a
          href={sample.copyUrl}
          target="_blank"
          rel="noopener noreferrer"
          class="btn btn-xs btn-primary"
          onclick={onCopy}
        >
          {sample_copy_button()}
        </a>
      </div>
    </div>
  </div>
</article>
