<script lang="ts">
  import {
    sample_form_title_label,
    sample_form_title_placeholder,
    sample_form_description_label,
    sample_form_description_placeholder,
    sample_form_url_label,
    sample_form_url_placeholder,
    sample_form_url_help,
    sample_form_tags_label,
    sample_form_tags_placeholder,
    sample_form_tags_help,
    sample_form_submit,
    sample_form_submitting,
    sample_form_update,
    sample_form_updating,
    cancel,
  } from '$lib/paraglide/messages.js';
  import UrlPreview from './UrlPreview.svelte';
  import type { SampleCode } from '$lib/server/db/schema.js';

  interface Props {
    sample?: SampleCode | null;
    isSubmitting?: boolean;
    onSubmit: (data: {
      title: string;
      description: string;
      originalUrl: string;
      tags: string[];
    }) => void;
    onCancel?: () => void;
  }

  let { sample = null, isSubmitting = false, onSubmit, onCancel }: Props = $props();

  // フォーム入力状態
  let title = $state('');
  let description = $state('');
  let originalUrl = $state('');
  let tagsInput = $state('');

  // sample propが変更されたときにフォームの値を同期
  $effect(() => {
    title = sample?.title ?? '';
    description = sample?.description ?? '';
    originalUrl = sample?.originalUrl ?? '';
    tagsInput = sample?.tags?.join(', ') ?? '';
  });

  let isEditMode = $derived(sample !== null);

  function handleSubmit(e: Event) {
    e.preventDefault();
    const tags = tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);
    onSubmit({ title, description, originalUrl, tags });
  }
</script>

<form onsubmit={handleSubmit} class="space-y-6">
  <div class="form-control">
    <label class="label" for="title">
      <span class="label-text font-medium">
        {sample_form_title_label()}
        <span class="text-error">*</span>
      </span>
    </label>
    <input
      type="text"
      id="title"
      name="title"
      bind:value={title}
      placeholder={sample_form_title_placeholder()}
      class="input input-bordered w-full"
      required
      maxlength="200"
    />
  </div>

  <div class="form-control">
    <label class="label" for="description">
      <span class="label-text font-medium">
        {sample_form_description_label()}
        <span class="text-error">*</span>
      </span>
    </label>
    <textarea
      id="description"
      name="description"
      bind:value={description}
      placeholder={sample_form_description_placeholder()}
      class="textarea textarea-bordered min-h-32 w-full"
      required
      maxlength="5000"
    ></textarea>
  </div>

  <div class="form-control">
    <label class="label" for="originalUrl">
      <span class="label-text font-medium">
        {sample_form_url_label()}
        <span class="text-error">*</span>
      </span>
    </label>
    <input
      type="url"
      id="originalUrl"
      name="originalUrl"
      bind:value={originalUrl}
      placeholder={sample_form_url_placeholder()}
      class="input input-bordered w-full"
      required
    />
    <label class="label">
      <span class="label-text-alt text-base-content/60">{sample_form_url_help()}</span>
    </label>
    {#if originalUrl}
      <UrlPreview url={originalUrl} />
    {/if}
  </div>

  <div class="form-control">
    <label class="label" for="tags">
      <span class="label-text font-medium">{sample_form_tags_label()}</span>
    </label>
    <input
      type="text"
      id="tags"
      name="tags"
      bind:value={tagsInput}
      placeholder={sample_form_tags_placeholder()}
      class="input input-bordered w-full"
    />
    <label class="label">
      <span class="label-text-alt text-base-content/60">{sample_form_tags_help()}</span>
    </label>
  </div>

  <div class="flex justify-end gap-3">
    {#if onCancel}
      <button type="button" class="btn btn-outline" onclick={onCancel} disabled={isSubmitting}>
        {cancel()}
      </button>
    {/if}
    <button type="submit" class="btn btn-primary" disabled={isSubmitting}>
      {#if isSubmitting}
        <span class="loading loading-spinner loading-sm"></span>
        {isEditMode ? sample_form_updating() : sample_form_submitting()}
      {:else}
        {isEditMode ? sample_form_update() : sample_form_submit()}
      {/if}
    </button>
  </div>
</form>
