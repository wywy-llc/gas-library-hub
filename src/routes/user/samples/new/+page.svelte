<script lang="ts">
  import { sample_new_title, sample_form_related_library_info } from '$lib/paraglide/messages.js';
  import { enhance } from '$app/forms';
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
          タイトル
          <span class="text-error">*</span>
        </span>
      </label>
      <input
        type="text"
        id="title"
        name="title"
        value={form?.values?.title ?? ''}
        placeholder="スプレッドシート自動化テンプレート"
        class="input input-bordered w-full"
        required
        maxlength="200"
      />
    </div>

    <div class="form-control">
      <label class="label" for="description">
        <span class="label-text font-medium">
          説明
          <span class="text-error">*</span>
        </span>
      </label>
      <textarea
        id="description"
        name="description"
        value={form?.values?.description ?? ''}
        placeholder="このサンプルの使い方や特徴を説明してください"
        class="textarea textarea-bordered min-h-32 w-full"
        required
        maxlength="5000"
      ></textarea>
    </div>

    <div class="form-control">
      <label class="label" for="originalUrl">
        <span class="label-text font-medium">
          GoogleドキュメントURL
          <span class="text-error">*</span>
        </span>
      </label>
      <input
        type="url"
        id="originalUrl"
        name="originalUrl"
        value={form?.values?.originalUrl ?? ''}
        placeholder="https://docs.google.com/spreadsheets/d/xxxxx/edit"
        class="input input-bordered w-full"
        required
      />
      <label class="label">
        <span class="label-text-alt text-base-content/60">
          スプレッドシート、ドキュメント、スライド、Apps
          ScriptのURLを入力してください。自動的に「コピーを作成」リンクに変換されます。
        </span>
      </label>
    </div>

    <div class="form-control">
      <label class="label" for="tags">
        <span class="label-text font-medium">タグ</span>
      </label>
      <input
        type="text"
        id="tags"
        name="tags"
        value={form?.values?.tags ?? ''}
        placeholder="自動化, スプレッドシート"
        class="input input-bordered w-full"
      />
      <label class="label">
        <span class="label-text-alt text-base-content/60">
          カンマ区切りで最大10個まで入力できます
        </span>
      </label>
    </div>

    <div class="flex justify-end gap-3">
      <a href="/user/samples" class="btn btn-outline">キャンセル</a>
      <button type="submit" class="btn btn-primary" disabled={isSubmitting}>
        {#if isSubmitting}
          <span class="loading loading-spinner loading-sm"></span>
          投稿中...
        {:else}
          投稿する
        {/if}
      </button>
    </div>
  </form>
</div>
