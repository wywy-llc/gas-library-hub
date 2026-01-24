<script lang="ts">
  import { enhance } from '$app/forms';
  import { goto } from '$app/navigation';
  import { APP_CONFIG } from '$lib/constants/app-config.js';
  import type { ActionData, PageData } from './$types';

  interface Props {
    data: PageData;
    form?: ActionData;
  }

  let { data, form }: Props = $props();

  let isSubmitting = $state(false);
  let submitMessage = $state('');

  // フォーム送信時の処理
  $effect(() => {
    if (form?.success) {
      submitMessage = form.message || 'ライブラリ情報を更新しました。';
      setTimeout(() => {
        goto('/admin/libraries');
      }, 2000);
    } else if (form?.error) {
      submitMessage = form.error;
    }
  });

  function handleCancel() {
    goto('/admin/libraries');
  }

  // タグをJSON形式から表示用文字列に変換
  function tagsToString(tags: string[] | null): string {
    if (!tags || !Array.isArray(tags)) return '';
    return tags.join(', ');
  }

  // 表示用文字列をJSON形式に変換
  function stringToTags(str: string): string {
    if (!str.trim()) return '[]';
    const tags = str
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag);
    return JSON.stringify(tags);
  }

  // タグの表示用状態（dataの変更に追従）
  let tagsJaDisplay = $derived(tagsToString(data.library.tagsJa));
  let tagsEnDisplay = $derived(tagsToString(data.library.tagsEn));
</script>

<svelte:head>
  <title>ライブラリ編集 - {APP_CONFIG.SITE_NAME}</title>
  <meta name="description" content="ライブラリ情報とAI要約の編集" />
</svelte:head>

<div class="bg-gray-50">
  <main class="container mx-auto px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
    <div class="mx-auto max-w-4xl">
      <div class="mb-8 flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold text-gray-900">ライブラリ編集</h1>
          <p class="mt-2 text-sm text-gray-600">ライブラリの基本情報とAI要約情報を編集できます</p>
        </div>
        <button
          onclick={handleCancel}
          class="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
        >
          一覧に戻る
        </button>
      </div>

      <!-- 申請者情報表示 -->
      {#if data.library.requesterName}
        <div class="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <h3 class="text-sm font-medium text-blue-900">申請者情報</h3>
          <div class="mt-2 text-sm text-blue-800">
            <p>
              <strong>申請者:</strong>
              {data.library.requesterName} ({data.library.requesterEmail})
            </p>
            {#if data.library.requestNote}
              <p><strong>申請メモ:</strong> {data.library.requestNote}</p>
            {/if}
            <p>
              <strong>申請日:</strong>
              {new Date(data.library.createdAt).toLocaleDateString('ja-JP')}
            </p>
          </div>
        </div>
      {/if}

      <!-- 送信メッセージ -->
      {#if submitMessage}
        <div
          class="mb-6 rounded-md p-4 {form?.success
            ? 'bg-green-50 text-green-800'
            : 'bg-red-50 text-red-800'}"
        >
          {submitMessage}
        </div>
      {/if}

      <form
        method="POST"
        action="?/updateLibrary"
        class="space-y-8"
        use:enhance={() => {
          isSubmitting = true;
          submitMessage = '';

          return async ({ result, update }) => {
            isSubmitting = false;

            if (result.type === 'failure') {
              submitMessage =
                (result.data as { error?: string })?.error || 'エラーが発生しました。';
            } else if (result.type === 'error') {
              submitMessage = 'サーバーエラーが発生しました。';
            }

            await update();
          };
        }}
      >
        <!-- ライブラリ基本情報 -->
        <div class="overflow-hidden rounded-lg bg-white shadow-md">
          <div class="border-b border-gray-200 px-6 py-4">
            <h2 class="text-lg font-medium text-gray-900">ライブラリ基本情報</h2>
          </div>
          <div class="px-6 py-8">
            <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <!-- ライブラリ名 -->
              <div class="sm:col-span-2">
                <label for="name" class="block text-sm font-medium text-gray-700">
                  ライブラリ名 <span class="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  id="name"
                  value={data.library.name}
                  class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                  disabled={isSubmitting}
                />
              </div>

              <!-- スクリプトID -->
              <div>
                <label for="scriptId" class="block text-sm font-medium text-gray-700">
                  GAS スクリプトID <span class="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="scriptId"
                  id="scriptId"
                  value={data.library.scriptId}
                  class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                  disabled={isSubmitting}
                />
              </div>

              <!-- ステータス -->
              <div>
                <label for="status" class="block text-sm font-medium text-gray-700">
                  ステータス <span class="text-red-500">*</span>
                </label>
                <select
                  name="status"
                  id="status"
                  class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                  disabled={isSubmitting}
                >
                  <option value="pending" selected={data.library.status === 'pending'}
                    >申請中</option
                  >
                  <option value="published" selected={data.library.status === 'published'}
                    >公開済み</option
                  >
                </select>
              </div>

              <!-- リポジトリURL -->
              <div class="sm:col-span-2">
                <label for="repositoryUrl" class="block text-sm font-medium text-gray-700">
                  GitHub リポジトリURL <span class="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  name="repositoryUrl"
                  id="repositoryUrl"
                  value={data.library.repositoryUrl}
                  class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                  disabled={isSubmitting}
                />
              </div>

              <!-- 作者名 -->
              <div>
                <label for="authorName" class="block text-sm font-medium text-gray-700">
                  作者名 <span class="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="authorName"
                  id="authorName"
                  value={data.library.authorName}
                  class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                  disabled={isSubmitting}
                />
              </div>

              <!-- 作者URL -->
              <div>
                <label for="authorUrl" class="block text-sm font-medium text-gray-700">
                  作者URL
                </label>
                <input
                  type="url"
                  name="authorUrl"
                  id="authorUrl"
                  value={data.library.authorUrl}
                  class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  disabled={isSubmitting}
                />
              </div>

              <!-- ライセンス種類 -->
              <div>
                <label for="licenseType" class="block text-sm font-medium text-gray-700">
                  ライセンス種類
                </label>
                <input
                  type="text"
                  name="licenseType"
                  id="licenseType"
                  value={data.library.licenseType}
                  class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  disabled={isSubmitting}
                />
              </div>

              <!-- ライセンスURL -->
              <div>
                <label for="licenseUrl" class="block text-sm font-medium text-gray-700">
                  ライセンスURL
                </label>
                <input
                  type="url"
                  name="licenseUrl"
                  id="licenseUrl"
                  value={data.library.licenseUrl}
                  class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  disabled={isSubmitting}
                />
              </div>

              <!-- 説明 -->
              <div class="sm:col-span-2">
                <label for="description" class="block text-sm font-medium text-gray-700">
                  説明 <span class="text-red-500">*</span>
                </label>
                <textarea
                  name="description"
                  id="description"
                  rows="3"
                  class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                  disabled={isSubmitting}>{data.library.description}</textarea
                >
              </div>
            </div>
          </div>
        </div>

        <!-- AI要約情報 -->
        <div class="overflow-hidden rounded-lg bg-white shadow-md">
          <div class="border-b border-gray-200 px-6 py-4">
            <h2 class="text-lg font-medium text-gray-900">AI要約情報</h2>
            <p class="text-sm text-gray-500">SEOや検索向上のためのAI生成情報を編集できます</p>
          </div>
          <div class="px-6 py-8">
            <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <!-- ライブラリ名（日本語） -->
              <div>
                <label for="libraryNameJa" class="block text-sm font-medium text-gray-700">
                  ライブラリ名（日本語）
                </label>
                <input
                  type="text"
                  name="libraryNameJa"
                  id="libraryNameJa"
                  value={data.library.libraryNameJa || ''}
                  class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  disabled={isSubmitting}
                />
              </div>

              <!-- ライブラリ名（英語） -->
              <div>
                <label for="libraryNameEn" class="block text-sm font-medium text-gray-700">
                  ライブラリ名（英語）
                </label>
                <input
                  type="text"
                  name="libraryNameEn"
                  id="libraryNameEn"
                  value={data.library.libraryNameEn || ''}
                  class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  disabled={isSubmitting}
                />
              </div>

              <!-- 目的（日本語） -->
              <div>
                <label for="purposeJa" class="block text-sm font-medium text-gray-700">
                  目的（日本語）
                </label>
                <textarea
                  name="purposeJa"
                  id="purposeJa"
                  rows="3"
                  class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  disabled={isSubmitting}>{data.library.purposeJa || ''}</textarea
                >
              </div>

              <!-- 目的（英語） -->
              <div>
                <label for="purposeEn" class="block text-sm font-medium text-gray-700">
                  目的（英語）
                </label>
                <textarea
                  name="purposeEn"
                  id="purposeEn"
                  rows="3"
                  class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  disabled={isSubmitting}>{data.library.purposeEn || ''}</textarea
                >
              </div>

              <!-- 対象ユーザー（日本語） -->
              <div>
                <label for="targetUsersJa" class="block text-sm font-medium text-gray-700">
                  対象ユーザー（日本語）
                </label>
                <textarea
                  name="targetUsersJa"
                  id="targetUsersJa"
                  rows="2"
                  class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  disabled={isSubmitting}>{data.library.targetUsersJa || ''}</textarea
                >
              </div>

              <!-- 対象ユーザー（英語） -->
              <div>
                <label for="targetUsersEn" class="block text-sm font-medium text-gray-700">
                  対象ユーザー（英語）
                </label>
                <textarea
                  name="targetUsersEn"
                  id="targetUsersEn"
                  rows="2"
                  class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  disabled={isSubmitting}>{data.library.targetUsersEn || ''}</textarea
                >
              </div>

              <!-- タグ（日本語） -->
              <div>
                <label for="tagsJa" class="block text-sm font-medium text-gray-700">
                  タグ（日本語）
                </label>
                <input
                  type="text"
                  bind:value={tagsJaDisplay}
                  class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="タグ1, タグ2, タグ3"
                  disabled={isSubmitting}
                />
                <input type="hidden" name="tagsJa" value={stringToTags(tagsJaDisplay)} />
                <p class="mt-1 text-xs text-gray-500">カンマ区切りで入力してください</p>
              </div>

              <!-- タグ（英語） -->
              <div>
                <label for="tagsEn" class="block text-sm font-medium text-gray-700">
                  タグ（英語）
                </label>
                <input
                  type="text"
                  bind:value={tagsEnDisplay}
                  class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="tag1, tag2, tag3"
                  disabled={isSubmitting}
                />
                <input type="hidden" name="tagsEn" value={stringToTags(tagsEnDisplay)} />
                <p class="mt-1 text-xs text-gray-500">カンマ区切りで入力してください</p>
              </div>

              <!-- 解決する課題（日本語） -->
              <div>
                <label for="coreProblemJa" class="block text-sm font-medium text-gray-700">
                  解決する課題（日本語）
                </label>
                <textarea
                  name="coreProblemJa"
                  id="coreProblemJa"
                  rows="3"
                  class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  disabled={isSubmitting}>{data.library.coreProblemJa || ''}</textarea
                >
              </div>

              <!-- 解決する課題（英語） -->
              <div>
                <label for="coreProblemEn" class="block text-sm font-medium text-gray-700">
                  解決する課題（英語）
                </label>
                <textarea
                  name="coreProblemEn"
                  id="coreProblemEn"
                  rows="3"
                  class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  disabled={isSubmitting}>{data.library.coreProblemEn || ''}</textarea
                >
              </div>

              <!-- 使用例（日本語） -->
              <div>
                <label for="usageExampleJa" class="block text-sm font-medium text-gray-700">
                  使用例（日本語）
                </label>
                <textarea
                  name="usageExampleJa"
                  id="usageExampleJa"
                  rows="4"
                  class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  disabled={isSubmitting}>{data.library.usageExampleJa || ''}</textarea
                >
              </div>

              <!-- 使用例（英語） -->
              <div>
                <label for="usageExampleEn" class="block text-sm font-medium text-gray-700">
                  使用例（英語）
                </label>
                <textarea
                  name="usageExampleEn"
                  id="usageExampleEn"
                  rows="4"
                  class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  disabled={isSubmitting}>{data.library.usageExampleEn || ''}</textarea
                >
              </div>

              <!-- SEOタイトル（日本語） -->
              <div>
                <label for="seoTitleJa" class="block text-sm font-medium text-gray-700">
                  SEOタイトル（日本語）
                </label>
                <input
                  type="text"
                  name="seoTitleJa"
                  id="seoTitleJa"
                  value={data.library.seoTitleJa || ''}
                  class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  disabled={isSubmitting}
                />
              </div>

              <!-- SEOタイトル（英語） -->
              <div>
                <label for="seoTitleEn" class="block text-sm font-medium text-gray-700">
                  SEOタイトル（英語）
                </label>
                <input
                  type="text"
                  name="seoTitleEn"
                  id="seoTitleEn"
                  value={data.library.seoTitleEn || ''}
                  class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  disabled={isSubmitting}
                />
              </div>

              <!-- SEO説明（日本語） -->
              <div>
                <label for="seoDescriptionJa" class="block text-sm font-medium text-gray-700">
                  SEO説明（日本語）
                </label>
                <textarea
                  name="seoDescriptionJa"
                  id="seoDescriptionJa"
                  rows="2"
                  class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  disabled={isSubmitting}>{data.library.seoDescriptionJa || ''}</textarea
                >
              </div>

              <!-- SEO説明（英語） -->
              <div>
                <label for="seoDescriptionEn" class="block text-sm font-medium text-gray-700">
                  SEO説明（英語）
                </label>
                <textarea
                  name="seoDescriptionEn"
                  id="seoDescriptionEn"
                  rows="2"
                  class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  disabled={isSubmitting}>{data.library.seoDescriptionEn || ''}</textarea
                >
              </div>
            </div>
          </div>
        </div>

        <!-- アクションボタン -->
        <div class="flex items-center justify-end space-x-3">
          <button
            type="button"
            onclick={handleCancel}
            class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            disabled={isSubmitting}
          >
            キャンセル
          </button>
          <button
            type="submit"
            class="inline-flex items-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isSubmitting}
          >
            {#if isSubmitting}
              <svg
                class="mr-2 h-4 w-4 animate-spin"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              更新中...
            {:else}
              更新
            {/if}
          </button>
        </div>
      </form>
    </div>
  </main>
</div>
