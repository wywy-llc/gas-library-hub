<script lang="ts">
  import { enhance } from '$app/forms';
  import MarkdownRenderer from '$lib/components/MarkdownRenderer.svelte';
  import {
    cancel,
    sample_form_description_edit,
    sample_form_description_label,
    sample_form_description_markdown_help,
    sample_form_description_placeholder,
    sample_form_description_preview,
    sample_form_related_library_info,
    sample_form_submit,
    sample_form_submitting,
    sample_form_tags_help,
    sample_form_tags_label,
    sample_form_tags_placeholder,
    sample_form_title_label,
    sample_form_title_placeholder,
    sample_form_url_help,
    sample_form_url_label,
    sample_form_url_placeholder,
    sample_new_title,
  } from '$lib/paraglide/messages.js';
  import type { PageData } from './$types.js';

  interface FormErrors {
    error?: string;
    values?: {
      title: string;
      description: string;
      originalUrl: string;
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
  let descriptionValue = $state(form?.values?.description ?? '');
</script>

<svelte:head>
  <title>{sample_new_title()}</title>
</svelte:head>

<div class="container mx-auto max-w-2xl px-4 py-8">
  <h1 class="mb-6 text-2xl font-bold">{sample_new_title()}</h1>

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
      return async ({ update }) => {
        isSubmitting = false;
        await update();
      };
    }}
    class="space-y-6"
  >
    {#if data.relatedLibrary}
      <input type="hidden" name="libraryId" value={data.relatedLibrary.id} />
    {/if}

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
        value={form?.values?.title ?? ''}
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
        <span class="label-text font-medium">
          {sample_form_url_label()}
          <span class="text-error">*</span>
        </span>
      </label>
      <input
        type="url"
        id="originalUrl"
        name="originalUrl"
        value={form?.values?.originalUrl ?? ''}
        placeholder={sample_form_url_placeholder()}
        class="input input-bordered w-full"
        required
      />
      <p class="label-text-alt text-base-content/60 mt-1 px-1">
        {sample_form_url_help()}
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
        value={form?.values?.tags ?? ''}
        placeholder={sample_form_tags_placeholder()}
        class="input input-bordered w-full"
      />
      <p class="label-text-alt text-base-content/60 mt-1 px-1">
        {sample_form_tags_help()}
      </p>
    </div>

    <div class="flex justify-end gap-3">
      <a href="/user/samples" class="btn btn-outline">{cancel()}</a>
      <button type="submit" class="btn btn-primary" disabled={isSubmitting}>
        {#if isSubmitting}
          <span class="loading loading-spinner loading-sm"></span>
          {sample_form_submitting()}
        {:else}
          {sample_form_submit()}
        {/if}
      </button>
    </div>
  </form>
</div>
