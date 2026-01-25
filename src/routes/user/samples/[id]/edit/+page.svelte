<script lang="ts">
  import { enhance } from '$app/forms';
  import { goto } from '$app/navigation';
  import MarkdownRenderer from '$lib/components/MarkdownRenderer.svelte';
  import {
    cancel,
    sample_edit_title,
    sample_edit_url_readonly_help,
    sample_form_description_edit,
    sample_form_description_label,
    sample_form_description_markdown_help,
    sample_form_description_placeholder,
    sample_form_description_preview,
    sample_form_related_library_info,
    sample_form_tags_help,
    sample_form_tags_label,
    sample_form_tags_placeholder,
    sample_form_title_label,
    sample_form_title_placeholder,
    sample_form_update,
    sample_form_updating,
    sample_form_url_label,
  } from '$lib/paraglide/messages.js';
  import type { PageData } from './$types.js';

  interface FormErrors {
    error?: string;
    values?: {
      title: string;
      description: string;
      tags: string;
    };
  }

  interface Props {
    data: PageData;
    form: FormErrors | null;
  }

  let { data, form }: Props = $props();

  let isSubmitting = $state(false);
  let showPreview = $state(false);

  // フォームの初期値（propsまたはエラー時の入力値）
  let title = $derived(form?.values?.title ?? data.sample.title);
  let description = $derived(form?.values?.description ?? data.sample.description);
  let tags = $derived(form?.values?.tags ?? data.sample.tags.join(', '));

  // descriptionValue: 初期値はdescriptionから派生、ユーザー入力で上書き可能
  let descriptionValue = $derived.by(() => description);
</script>

<svelte:head>
  <title>{sample_edit_title()}</title>
</svelte:head>

<div class="container mx-auto max-w-2xl px-4 py-8">
  <h1 class="mb-6 text-2xl font-bold">{sample_edit_title()}</h1>

  {#if form?.error}
    <div class="alert alert-error mb-6">
      <span>{form.error}</span>
    </div>
  {/if}

  {#if data.relatedLibrary}
    <div class="alert alert-info mb-6">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        class="h-6 w-6 shrink-0 stroke-current"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        ></path>
      </svg>
      <span>{sample_form_related_library_info({ libraryName: data.relatedLibrary.name })}</span>
    </div>
  {/if}

  <form
    method="POST"
    use:enhance={() => {
      isSubmitting = true;
      return async ({ result, update }) => {
        isSubmitting = false;
        if (result.type === 'redirect') {
          await goto(result.location, { replaceState: true });
        } else {
          await update();
        }
      };
    }}
    class="space-y-6"
  >
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
        value={title}
        placeholder={sample_form_title_placeholder()}
        class="input input-bordered w-full"
        required
        maxlength="200"
      />
    </div>

    <div class="form-control">
      <div class="flex items-center justify-between">
        <label class="label" for="description">
          <span class="label-text font-medium">
            {sample_form_description_label()}
            <span class="text-error">*</span>
          </span>
        </label>
        <div class="tabs tabs-boxed tabs-sm">
          <button
            type="button"
            class="tab"
            class:tab-active={!showPreview}
            onclick={() => (showPreview = false)}
          >
            {sample_form_description_edit()}
          </button>
          <button
            type="button"
            class="tab"
            class:tab-active={showPreview}
            onclick={() => (showPreview = true)}
          >
            {sample_form_description_preview()}
          </button>
        </div>
      </div>
      {#if showPreview}
        <div class="border-base-300 bg-base-100 min-h-32 rounded-lg border p-4">
          <MarkdownRenderer content={descriptionValue} />
        </div>
      {:else}
        <textarea
          id="description"
          name="description"
          bind:value={descriptionValue}
          placeholder={sample_form_description_placeholder()}
          class="textarea textarea-bordered min-h-32 w-full"
          required
          maxlength="50000"
        ></textarea>
      {/if}
      <p class="label-text-alt text-base-content/60 mt-1 flex items-center gap-1 px-1">
        <span class="text-lg" aria-hidden="true">📝</span>
        {sample_form_description_markdown_help()}
      </p>
    </div>

    <div class="form-control">
      <label class="label" for="originalUrl">
        <span class="label-text font-medium">{sample_form_url_label()}</span>
      </label>
      <input
        type="url"
        id="originalUrl"
        name="originalUrl"
        value={data.sample.originalUrl}
        class="input input-bordered w-full"
        disabled
      />
      <p class="label-text-alt text-base-content/60 mt-1 px-1">
        {sample_edit_url_readonly_help()}
      </p>
    </div>

    <div class="form-control">
      <label class="label" for="tags">
        <span class="label-text font-medium">{sample_form_tags_label()}</span>
      </label>
      <input
        type="text"
        id="tags"
        name="tags"
        value={tags}
        placeholder={sample_form_tags_placeholder()}
        class="input input-bordered w-full"
      />
      <p class="label-text-alt text-base-content/60 mt-1 px-1">
        {sample_form_tags_help()}
      </p>
    </div>

    <div class="flex justify-end gap-3">
      <a href="/user/samples/{data.sample.id}" class="btn btn-outline">{cancel()}</a>
      <button type="submit" class="btn btn-primary" disabled={isSubmitting}>
        {#if isSubmitting}
          <span class="loading loading-spinner loading-sm"></span>
          {sample_form_updating()}
        {:else}
          {sample_form_update()}
        {/if}
      </button>
    </div>
  </form>
</div>
