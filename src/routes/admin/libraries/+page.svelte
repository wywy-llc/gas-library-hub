<script lang="ts">
  import { enhance } from '$app/forms';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { SvelteURLSearchParams } from 'svelte/reactivity';
  import StatusUpdateButtons from '$lib/components/admin/StatusUpdateButtons.svelte';
  import Footer from '$lib/components/Footer.svelte';
  import { APP_CONFIG, PAGINATION } from '$lib/constants/app-config.js';
  import {
    DEFAULT_GITHUB_SEARCH_SORT,
    GITHUB_SEARCH_SORT_CHOICES,
  } from '$lib/constants/github-search.js';
  import {
    LIBRARY_STATUS_BADGE_CLASS,
    LIBRARY_STATUS_TEXT,
    type LibraryStatus,
  } from '$lib/constants/library-status.js';
  import { DEFAULT_SCRAPER_CONFIG } from '$lib/constants/scraper-config.js';
  import type { ActionData, PageData } from './$types';

  // 管理者画面 - ライブラリ一覧ページ
  // 全ライブラリの承認・削除を管理

  interface Props {
    data: PageData;
    form?: ActionData;
  }

  let { data, form }: Props = $props();

  let libraries: typeof data.libraries = $state(data.libraries);
  let currentPage = $state(data.currentPage);

  // dataが更新された時にcurrentPageと検索値も同期
  $effect(() => {
    currentPage = data.currentPage;
    searchValue = data.searchQuery; // 検索値をサーバーサイドの値と同期

    // 現在のページが総ページ数を超えている場合は1ページ目にリダイレクト
    if (totalPages > 0 && currentPage > totalPages) {
      updatePageUrl(1);
    }
  });
  let totalItems = $derived(libraries.length);
  let itemsPerPage = 10;
  let totalPages = $derived(Math.ceil(totalItems / itemsPerPage));
  let paginatedLibraries = $derived(
    libraries.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
  );
  let statusUpdateInProgress: Record<string, boolean> = {};
  let showBulkAddForm = $state(false);
  let bulkAddInProgress = $state(false);
  let startPage = $state(PAGINATION.MIN_PAGE);
  let endPage = $state(PAGINATION.MIN_PAGE);
  let perPage = $state(PAGINATION.PER_PAGE_OPTIONS[3]); // 100件/ページ
  let sortOption = $state(DEFAULT_GITHUB_SEARCH_SORT);
  let maxResults = $derived(Math.max(0, (endPage - startPage + 1) * perPage));
  let bulkUpdateInProgress = $state(false);
  let bulkUpdateMessage = $state('');
  let bulkValidateInProgress = $state(false);
  let bulkValidateMessage = $state('');
  let selectedTags = $state(resetSelectedTags()); // 初期値は全タグ選択
  let searchValue = $state(data.searchQuery); // 検索入力の状態管理

  /**
   * selectedTagsを初期値にリセット
   */
  function resetSelectedTags(): string[] {
    return [...DEFAULT_SCRAPER_CONFIG.gasTags];
  }

  async function handleStatusUpdate(libraryId: string, newStatus: LibraryStatus) {
    statusUpdateInProgress[libraryId] = true;

    try {
      // FormDataを使用してSvelteKitのアクションエンドポイントに送信
      const formData = new FormData();
      formData.append('status', newStatus);

      const response = await fetch(`/admin/libraries/${libraryId}?/updateStatus`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        // レスポンスをJSONとして解析
        const result = await response.json();

        if (result.type === 'success') {
          // ライブラリのステータスを更新
          libraries = libraries.map(lib =>
            lib.id === libraryId ? { ...lib, status: newStatus as LibraryStatus } : lib
          ) as typeof libraries;
        } else {
          console.error('ステータス更新に失敗しました:', result.data?.error || '不明なエラー');
        }
      } else {
        console.error('ステータス更新に失敗しました');
      }
    } catch (error) {
      console.error('ステータス更新エラー:', error);
    } finally {
      statusUpdateInProgress[libraryId] = false;
    }
  }

  async function handleDelete(id: string) {
    const targetLibrary = libraries.find(lib => lib.id === id);
    const libraryName = targetLibrary?.name || 'ライブラリ';

    if (!confirm(`本当に「${libraryName}」を削除しますか？この操作は取り消せません。`)) {
      return;
    }

    try {
      // FormDataを使用してSvelteKitのdeleteアクションに送信
      const formData = new FormData();
      formData.append('libraryId', id);

      const response = await fetch('?/delete', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        // レスポンスをJSONとして解析
        const result = await response.json();

        if (result.type === 'success') {
          // ライブラリ一覧から削除されたライブラリを除去
          libraries = libraries.filter(lib => lib.id !== id);
          alert(result.data?.message || 'ライブラリを削除しました。');
        } else {
          console.error('ライブラリ削除に失敗しました:', result.data?.error || '不明なエラー');
          alert(result.data?.error || 'ライブラリの削除に失敗しました。');
        }
      } else {
        console.error('ライブラリ削除に失敗しました');
        alert('ライブラリの削除に失敗しました。');
      }
    } catch (error) {
      console.error('ライブラリ削除エラー:', error);
      alert('ライブラリの削除中にエラーが発生しました。');
    }
  }

  function toggleBulkAddForm() {
    showBulkAddForm = !showBulkAddForm;
    if (!showBulkAddForm) {
      startPage = PAGINATION.MIN_PAGE;
      endPage = PAGINATION.MIN_PAGE;
      perPage = PAGINATION.PER_PAGE_OPTIONS[3]; // 100件/ページ
      sortOption = DEFAULT_GITHUB_SEARCH_SORT;
      selectedTags = resetSelectedTags();
    }
  }

  async function handleBulkUpdate() {
    if (bulkUpdateInProgress) return;

    // 却下ステータスのライブラリを除外
    const targetLibraries = libraries.filter(lib => lib.status !== ('rejected' as LibraryStatus));

    if (
      !confirm(
        `既存の${targetLibraries.length}件のライブラリのGitHub情報（Star数等）を一括更新しますか？\n\n却下ステータスのライブラリは対象外です。\nAI要約の更新は行われません。\nこの処理には時間がかかる場合があります。`
      )
    ) {
      return;
    }

    bulkUpdateInProgress = true;
    bulkUpdateMessage = '既存ライブラリのGitHub情報を一括更新中...';

    try {
      let successCount = 0;
      let errorCount = 0;
      const totalLibraries = targetLibraries.length;

      for (let i = 0; i < targetLibraries.length; i++) {
        const library = targetLibraries[i];
        bulkUpdateMessage = `${i + 1}/${totalLibraries} GitHub情報を更新中: ${library.name}`;

        try {
          const response = await fetch(`/admin/libraries/${library.id}/scraping`, {
            method: 'POST',
          });

          if (response.ok) {
            successCount++;
          } else {
            errorCount++;
            console.error(`ライブラリ ${library.name} の更新に失敗:`, await response.text());
          }
        } catch (error) {
          errorCount++;
          console.error(`ライブラリ ${library.name} の更新エラー:`, error);
        }

        await new Promise(resolve => setTimeout(resolve, 500));
      }

      bulkUpdateMessage = `GitHub情報の一括更新が完了しました。成功: ${successCount}件、失敗: ${errorCount}件`;

      setTimeout(() => {
        bulkUpdateMessage = '';
        window.location.reload();
      }, 3000);
    } catch (error) {
      console.error('GitHub情報一括更新エラー:', error);
      bulkUpdateMessage = 'GitHub情報の一括更新中にエラーが発生しました。';
    } finally {
      bulkUpdateInProgress = false;
      setTimeout(() => {
        bulkUpdateMessage = '';
      }, 5000);
    }
  }

  /**
   * ライブラリ一括検証・却下処理
   */
  async function handleBulkValidateAndReject() {
    if (bulkValidateInProgress) return;

    const confirmMessage = `既存のライブラリをスクレイピングパターンで検証し、適合しないライブラリを自動的に却下しますか？
この処理には時間がかかる場合があります。`;

    if (!confirm(confirmMessage)) {
      return;
    }

    bulkValidateInProgress = true;
    bulkValidateMessage = 'ライブラリを検証中...';

    try {
      const response = await fetch('/admin/libraries/bulk-validate-and-reject', {
        method: 'POST',
      });

      const result = await response.json();

      if (result.success) {
        bulkValidateMessage = result.message;

        // 却下されたライブラリがある場合は詳細情報を表示
        if (result.rejectedLibraries && result.rejectedLibraries.length > 0) {
          const rejectedNames = result.rejectedLibraries
            .slice(0, 5) // 最初の5件のみ表示
            .map((lib: { id: string; name: string; reason: string }) => lib.name)
            .join(', ');

          const additionalInfo =
            result.rejectedLibraries.length > 5
              ? ` 他${result.rejectedLibraries.length - 5}件`
              : '';

          bulkValidateMessage += `\n却下されたライブラリ: ${rejectedNames}${additionalInfo}`;
        }
      } else {
        bulkValidateMessage = result.message || '一括検証中にエラーが発生しました。';
      }

      // 3秒後にページをリロード（更新されたデータを表示するため）
      setTimeout(() => {
        bulkValidateMessage = '';
        window.location.reload();
      }, 3000);
    } catch (error) {
      console.error('一括検証エラー:', error);
      bulkValidateMessage = '一括検証中にエラーが発生しました。';
    } finally {
      bulkValidateInProgress = false;
      setTimeout(() => {
        bulkValidateMessage = '';
      }, 5000);
    }
  }

  // URLを更新してページ遷移する関数
  function updatePageUrl(newPage: number) {
    const url = new URL($page.url);
    if (newPage === 1) {
      url.searchParams.delete('page');
    } else {
      url.searchParams.set('page', newPage.toString());
    }
    goto(url.toString(), { replaceState: false });
  }

  function goToPage(pageNumber: number) {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      updatePageUrl(pageNumber);
    }
  }

  function goToPreviousPage() {
    if (currentPage > 1) {
      updatePageUrl(currentPage - 1);
    }
  }

  function goToNextPage() {
    if (currentPage < totalPages) {
      updatePageUrl(currentPage + 1);
    }
  }

  /**
   * 検索フォーム送信時の処理
   */
  function handleSearchSubmit(event: SubmitEvent) {
    event.preventDefault();

    const form = event.target as HTMLFormElement;

    // フォームから直接値を取得
    const searchInput = form.querySelector('input[name="search"]') as HTMLInputElement;
    const actualSearchValue = searchInput?.value || '';

    // URLを構築
    const params = new SvelteURLSearchParams();
    if (actualSearchValue.trim()) {
      params.set('search', actualSearchValue.trim());
    }
    if (data.scriptTypeFilter) {
      params.set('scriptType', data.scriptTypeFilter);
    }

    const newUrl = `/admin/libraries${params.toString() ? '?' + params.toString() : ''}`;

    // ブラウザの標準的な画面遷移を使用
    window.location.href = newUrl;
  }
</script>

<svelte:head>
  <title
    >管理画面 - ライブラリ一覧{currentPage > 1 ? ` (${currentPage}ページ目)` : ''} - {APP_CONFIG.SITE_NAME}</title
  >
  <meta
    name="description"
    content="{APP_CONFIG.SITE_NAME}管理者画面 - ライブラリの承認・削除を管理"
  />
</svelte:head>

<main class="container mx-auto px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
  <div class="mb-8">
    <div class="mb-4 flex items-center justify-between">
      <h1 class="text-3xl font-bold text-gray-900">ライブラリ管理</h1>
      <div class="flex space-x-2">
        <a
          href="/admin/libraries/new"
          class="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
        >
          新規追加
        </a>
        <button
          onclick={toggleBulkAddForm}
          class="inline-flex items-center justify-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700"
          title="GitHubタグ検索で新しいライブラリを一括追加"
        >
          一括新規追加
        </button>
        <button
          onclick={handleBulkUpdate}
          disabled={bulkUpdateInProgress}
          class="inline-flex items-center justify-center rounded-md border border-transparent bg-orange-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
          title="既存ライブラリのGitHub情報を一括更新（Star数等）"
        >
          {#if bulkUpdateInProgress}
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
            既存更新中...
          {:else}
            既存一括更新
          {/if}
        </button>
        <button
          onclick={handleBulkValidateAndReject}
          disabled={bulkValidateInProgress}
          class="inline-flex items-center justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          title="最新のスクレイピングパターンに適合しないライブラリを自動的に却下"
        >
          {#if bulkValidateInProgress}
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
            一括検証中...
          {:else}
            一括検証・却下
          {/if}
        </button>
      </div>
    </div>

    <!-- 検索フォーム -->
    <div class="flex items-center gap-4">
      <div class="max-w-md flex-1">
        <form method="GET" class="relative" id="searchForm" onsubmit={handleSearchSubmit}>
          <input
            type="text"
            name="search"
            bind:value={searchValue}
            placeholder="ライブラリ名、説明で検索..."
            class="block w-full rounded-md border border-gray-300 bg-white py-2 pr-10 pl-3 text-sm placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            autocomplete="off"
          />
          <!-- スクリプトタイプを隠しフィールドで保持 -->
          <input type="hidden" name="scriptType" value={data.scriptTypeFilter} />
          <button
            type="submit"
            class="absolute inset-y-0 right-0 flex items-center pr-3"
            aria-label="検索実行"
          >
            <svg
              class="h-5 w-5 text-gray-400 hover:text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </button>
        </form>
      </div>

      <!-- スクリプトタイプフィルター -->
      <div class="flex items-center gap-2">
        <label for="scriptTypeFilter" class="text-sm font-medium text-gray-700">タイプ:</label>
        <form method="GET" id="scriptTypeForm">
          <!-- 検索クエリを隠しフィールドで保持 -->
          <input type="hidden" name="search" bind:value={searchValue} />
          <select
            id="scriptTypeFilter"
            name="scriptType"
            value={data.scriptTypeFilter}
            onchange={e => (e.target as HTMLSelectElement).form?.submit()}
            class="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">すべて</option>
            <option value="library">ライブラリ</option>
            <option value="web_app">Webアプリ</option>
          </select>
        </form>
      </div>

      {#if data.searchQuery || data.scriptTypeFilter}
        <div class="flex items-center gap-2">
          {#if data.searchQuery}
            <span class="text-sm text-gray-600">検索中: "{data.searchQuery}"</span>
          {/if}
          {#if data.scriptTypeFilter}
            <span class="text-sm text-gray-600">
              タイプ: {data.scriptTypeFilter === 'library' ? 'ライブラリ' : 'Webアプリ'}
            </span>
          {/if}
          <a href="/admin/libraries" class="text-sm text-blue-600 hover:text-blue-800"> クリア </a>
        </div>
      {/if}
    </div>
  </div>

  <!-- 一括更新メッセージ -->
  {#if bulkUpdateMessage}
    <div class="mb-6 rounded-md bg-blue-50 p-4 text-blue-800">
      <div class="flex">
        <svg class="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
          <path
            fill-rule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
            clip-rule="evenodd"
          />
        </svg>
        <div class="ml-3">
          <p class="text-sm font-medium">{bulkUpdateMessage}</p>
        </div>
      </div>
    </div>
  {/if}

  <!-- 一括検証メッセージ -->
  {#if bulkValidateMessage}
    <div class="mb-6 rounded-md bg-red-50 p-4 text-red-800">
      <div class="flex">
        <svg class="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
          <path
            fill-rule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
            clip-rule="evenodd"
          />
        </svg>
        <div class="ml-3">
          <p class="text-sm font-medium whitespace-pre-line">{bulkValidateMessage}</p>
        </div>
      </div>
    </div>
  {/if}

  <!-- 一括追加フォーム -->
  {#if showBulkAddForm}
    <div class="mb-8 rounded-lg border border-gray-200 bg-white p-6 shadow-md">
      <div class="mb-4 flex items-center justify-between">
        <h2 class="text-xl font-semibold text-gray-900">一括新規追加</h2>
        <button
          onclick={toggleBulkAddForm}
          class="text-gray-400 hover:text-gray-600"
          aria-label="閉じる"
        >
          <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            ></path>
          </svg>
        </button>
      </div>

      <form
        method="POST"
        action="?/bulkAddByTags"
        use:enhance={() => {
          bulkAddInProgress = true;
          return async ({ result, update }) => {
            await update();
            bulkAddInProgress = false;
            if (result.type === 'success') {
              // 一括新規追加成功時は値をリセットしない（フォームの値を維持）
              showBulkAddForm = false;
              // ページリロードでライブラリ一覧を更新
              window.location.reload();
            }
          };
        }}
      >
        <!-- ページ範囲設定 -->
        <div class="mb-6 space-y-4">
          <h3 class="text-lg font-medium text-gray-900">検索範囲設定</h3>

          <!-- ページ範囲 -->
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label for="startPage" class="mb-1 block text-sm font-medium text-gray-700">
                開始ページ
              </label>
              <input
                id="startPage"
                name="startPage"
                type="number"
                min={PAGINATION.MIN_PAGE}
                max={PAGINATION.MAX_PAGE}
                bind:value={startPage}
                class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                disabled={bulkAddInProgress}
                required
              />
            </div>

            <div>
              <label for="endPage" class="mb-1 block text-sm font-medium text-gray-700">
                終了ページ
              </label>
              <input
                id="endPage"
                name="endPage"
                type="number"
                min={PAGINATION.MIN_PAGE}
                max={PAGINATION.MAX_PAGE}
                bind:value={endPage}
                class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                disabled={bulkAddInProgress}
                required
              />
            </div>

            <div>
              <label for="perPage" class="mb-1 block text-sm font-medium text-gray-700">
                1ページあたりの件数
              </label>
              <select
                id="perPage"
                name="perPage"
                bind:value={perPage}
                class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                disabled={bulkAddInProgress}
              >
                {#each PAGINATION.PER_PAGE_OPTIONS as option (option)}
                  <option value={option}>{option}件/ページ</option>
                {/each}
              </select>
            </div>
          </div>

          <!-- GitHubタグ選択 -->
          <div class="grid grid-cols-1 gap-4">
            <div>
              <div class="mb-2 text-sm font-medium text-gray-700">検索対象タグ</div>
              <div class="space-y-2">
                {#each DEFAULT_SCRAPER_CONFIG.gasTags as tag (tag)}
                  <label class="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      name="selectedTags"
                      value={tag}
                      bind:group={selectedTags}
                      class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      disabled={bulkAddInProgress}
                    />
                    <span class="text-sm text-gray-700">{tag}</span>
                  </label>
                {/each}
              </div>
              <p class="mt-1 text-xs text-gray-500">
                選択したタグを含むリポジトリを検索します。複数選択可能です。
              </p>
            </div>
          </div>

          <!-- 並び順設定 -->
          <div class="grid grid-cols-1 gap-4">
            <div>
              <label for="sortOption" class="mb-1 block text-sm font-medium text-gray-700">
                並び順
              </label>
              <select
                id="sortOption"
                name="sortOption"
                bind:value={sortOption}
                class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                disabled={bulkAddInProgress}
              >
                {#each GITHUB_SEARCH_SORT_CHOICES as choice (choice.key)}
                  <option value={choice.key}>{choice.label}</option>
                {/each}
              </select>
              <p class="mt-1 text-xs text-gray-500">
                {GITHUB_SEARCH_SORT_CHOICES.find(c => c.key === sortOption)?.description}
              </p>
            </div>
          </div>

          <!-- 総件数表示 -->
          <div class="rounded-md bg-gray-50 p-3">
            <p class="text-sm text-gray-700">
              <strong>📋 検索予定件数:</strong>
              {Math.max(0, (endPage - startPage + 1) * perPage)}件 (ページ {startPage} 〜 {endPage}, {perPage}件/ページ)
            </p>
            <p class="mt-1 text-xs text-gray-500">
              GitHub APIの制限により、最大{PAGINATION.MAX_TOTAL_RESULTS}件までの取得となります。
            </p>
          </div>

          <!-- 非表示のhiddenフィールド -->
          <input type="hidden" name="maxResults" bind:value={maxResults} />
          <div class="mt-2 rounded-md bg-blue-50 p-3">
            <p class="text-xs text-blue-700">
              <strong>📋 検索対象タグ:</strong>
              {selectedTags.join(', ')}
            </p>
            <p class="mt-1 text-xs text-blue-600">
              <strong>🔍 処理内容:</strong> GitHubでタグ検索 → READMEからスクリプトID抽出 → 重複チェック
              → DB登録
            </p>
            <p class="mt-1 text-xs text-orange-600">
              <strong>⚠️ 注意:</strong> 大量検索（500件以上）は時間がかかります（5-10分程度）
            </p>
          </div>
        </div>

        <div class="flex items-center justify-end space-x-3">
          <button
            type="button"
            onclick={toggleBulkAddForm}
            class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            disabled={bulkAddInProgress}
          >
            キャンセル
          </button>
          <button
            type="submit"
            class="inline-flex items-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={bulkAddInProgress}
          >
            {#if bulkAddInProgress}
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
              処理中...
            {:else}
              自動検索・一括追加実行
            {/if}
          </button>
        </div>
      </form>
    </div>
  {/if}

  <!-- 処理結果メッセージ -->
  {#if form?.success}
    <div class="mb-6 rounded-md bg-green-50 p-4 text-green-800">
      <div class="flex">
        <svg class="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
          <path
            fill-rule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clip-rule="evenodd"
          />
        </svg>
        <div class="ml-3">
          <p class="text-sm font-medium">{form.message}</p>
          {#if form.details}
            <div class="mt-2 text-xs">
              <p>総処理数: {form.details.total}件</p>
              <p>登録成功: {form.details.inserted}件</p>
              {#if form.details.errors > 0}
                <p>エラー: {form.details.errors}件</p>
              {/if}
              {#if form.details.duplicates > 0}
                <p>重複スキップ: {form.details.duplicates}件</p>
              {/if}
            </div>
          {/if}
        </div>
      </div>
    </div>
  {:else if form?.error}
    <div class="mb-6 rounded-md bg-red-50 p-4 text-red-800">
      <div class="flex">
        <svg class="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
          <path
            fill-rule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
            clip-rule="evenodd"
          />
        </svg>
        <div class="ml-3">
          <p class="text-sm font-medium">{form.error}</p>
        </div>
      </div>
    </div>
  {/if}

  <!-- 検索結果情報 -->
  <div class="mb-4 flex items-center justify-between">
    <div class="text-sm text-gray-600">
      {#if data.searchQuery}
        検索結果: {totalItems}件のライブラリが見つかりました
      {:else}
        全 {totalItems}件のライブラリ
      {/if}
    </div>
    {#if totalPages > 1}
      <div class="text-sm text-gray-600">
        {totalPages}ページ中 {currentPage}ページ目を表示
      </div>
    {/if}
  </div>

  <!-- Library List - Card Layout -->
  <div class="space-y-4">
    {#each paginatedLibraries as library (library.id)}
      <div class="overflow-hidden rounded-lg bg-white shadow-md transition-shadow hover:shadow-lg">
        <div class="p-6">
          <!-- Header Section -->
          <div class="flex items-start justify-between">
            <div class="min-w-0 flex-1">
              <div class="flex items-center space-x-3">
                <h3 class="truncate text-lg font-semibold text-gray-900">
                  <a
                    href="/admin/libraries/{library.id}"
                    class="text-blue-600 hover:text-blue-900 hover:underline"
                  >
                    {library.name}
                  </a>
                </h3>
                <!-- Script Type Badge -->
                <span
                  class={library.scriptType === 'library'
                    ? 'inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800'
                    : 'inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800'}
                >
                  {library.scriptType === 'library' ? 'ライブラリ' : 'Webアプリ'}
                </span>
                <!-- Status Badge -->
                <span class={LIBRARY_STATUS_BADGE_CLASS[library.status]}>
                  {LIBRARY_STATUS_TEXT[library.status]}
                </span>
              </div>

              <!-- Description -->
              {#if library.description}
                <p class="mt-1 line-clamp-2 text-sm text-gray-600">
                  {library.description}
                </p>
              {/if}
            </div>

            <!-- Actions -->
            <div class="ml-4 flex items-center space-x-2">
              <a
                href="/admin/libraries/{library.id}/edit"
                class="inline-flex items-center rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-100"
              >
                編集
              </a>
              <StatusUpdateButtons
                {library}
                isStatusUpdateInProgress={statusUpdateInProgress[library.id] || false}
                onStatusUpdate={status => handleStatusUpdate(library.id, status)}
                compact={true}
              />
              <button
                onclick={() => handleDelete(library.id)}
                class="inline-flex items-center rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-100"
              >
                削除
              </button>
            </div>
          </div>

          <!-- Details Grid -->
          <div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <!-- Script ID -->
            <div class="flex items-center space-x-2">
              <svg
                class="h-4 w-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                ></path>
              </svg>
              <div class="min-w-0 flex-1">
                <p class="text-xs text-gray-500">スクリプトID</p>
                <a
                  href={library.scriptType === 'library'
                    ? `https://script.google.com/u/1/home/projects/${library.scriptId}`
                    : `https://script.google.com/macros/s/${library.scriptId}/exec`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={library.scriptId}
                  class="block truncate font-mono text-sm text-blue-600 hover:text-blue-900 hover:underline"
                >
                  {library.scriptId.length > 20
                    ? library.scriptId.substring(0, 20) + '...'
                    : library.scriptId}
                </a>
              </div>
            </div>

            <!-- Author -->
            <div class="flex items-center space-x-2">
              <svg
                class="h-4 w-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                ></path>
              </svg>
              <div class="min-w-0 flex-1">
                <p class="text-xs text-gray-500">作者</p>
                <a
                  href={library.authorUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="block truncate text-sm text-blue-600 hover:text-blue-900 hover:underline"
                >
                  {library.authorName}
                </a>
              </div>
            </div>

            <!-- Stars -->
            <div class="flex items-center space-x-2">
              <svg class="h-4 w-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path
                  d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
                ></path>
              </svg>
              <div>
                <p class="text-xs text-gray-500">Stars</p>
                <p class="text-sm font-medium text-gray-900">
                  {library.starCount?.toLocaleString() || 0}
                </p>
              </div>
            </div>

            <!-- Last Updated -->
            <div class="flex items-center space-x-2">
              <svg
                class="h-4 w-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                ></path>
              </svg>
              <div>
                <p class="text-xs text-gray-500">最終更新</p>
                <p class="text-sm text-gray-900">
                  {new Date(library.updatedAt).toLocaleDateString('ja-JP')}
                </p>
              </div>
            </div>
          </div>

          <!-- Requester Info (if exists) -->
          {#if library.requesterName}
            <div class="mt-4 border-t border-gray-200 pt-4">
              <div class="flex items-center space-x-2">
                <svg
                  class="h-4 w-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  ></path>
                </svg>
                <div class="flex-1">
                  <p class="text-xs text-gray-500">申請者</p>
                  <div class="flex items-center space-x-2">
                    <span class="text-sm font-medium text-gray-900">{library.requesterName}</span>
                    <span class="text-sm text-gray-500">({library.requesterEmail})</span>
                  </div>
                  {#if library.requestNote}
                    <p class="mt-1 text-xs text-gray-600" title={library.requestNote}>
                      {library.requestNote.length > 100
                        ? library.requestNote.substring(0, 100) + '...'
                        : library.requestNote}
                    </p>
                  {/if}
                </div>
              </div>
            </div>
          {:else}
            <div class="mt-4 border-t border-gray-200 pt-4">
              <div class="flex items-center space-x-2">
                <svg
                  class="h-4 w-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  ></path>
                </svg>
                <div>
                  <p class="text-xs text-gray-500">追加者</p>
                  <span class="text-sm text-gray-600">管理者追加</span>
                </div>
              </div>
            </div>
          {/if}
        </div>
      </div>
    {/each}
  </div>

  <!-- Pagination -->
  <div
    class="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6"
  >
    <div class="flex flex-1 justify-between sm:hidden">
      <button
        onclick={goToPreviousPage}
        disabled={currentPage === 1}
        class="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        前へ
      </button>
      <button
        onclick={goToNextPage}
        disabled={currentPage === totalPages}
        class="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        次へ
      </button>
    </div>
    <div class="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
      <div>
        <p class="text-sm text-gray-700">
          全
          <span class="font-medium">{totalItems}</span>
          件中
          <span class="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span>
          -
          <span class="font-medium">{Math.min(currentPage * itemsPerPage, totalItems)}</span>
          件を表示
        </p>
      </div>
      <div>
        <nav
          class="relative z-0 inline-flex -space-x-px rounded-md shadow-sm"
          aria-label="Pagination"
        >
          <button
            onclick={goToPreviousPage}
            disabled={currentPage === 1}
            class="relative inline-flex items-center rounded-l-md border border-gray-300 bg-white px-2 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span class="sr-only">前へ</span>
            <svg
              class="h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fill-rule="evenodd"
                d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                clip-rule="evenodd"
              />
            </svg>
          </button>

          {#each Array.from({ length: totalPages }, (_, i) => i + 1) as page (page)}
            {#if totalPages <= 7 || page === 1 || page === totalPages || Math.abs(page - currentPage) <= 2}
              <button
                onclick={() => goToPage(page)}
                aria-current={page === currentPage ? 'page' : undefined}
                class={page === currentPage
                  ? 'relative z-10 inline-flex items-center border border-blue-500 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-600'
                  : 'relative inline-flex items-center border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50'}
              >
                {page}
              </button>
            {:else if page === currentPage - 3 || page === currentPage + 3}
              <span
                class="relative inline-flex items-center border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700"
              >
                ...
              </span>
            {/if}
          {/each}

          <button
            onclick={goToNextPage}
            disabled={currentPage === totalPages}
            class="relative inline-flex items-center rounded-r-md border border-gray-300 bg-white px-2 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span class="sr-only">次へ</span>
            <svg
              class="h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fill-rule="evenodd"
                d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                clip-rule="evenodd"
              />
            </svg>
          </button>
        </nav>
      </div>
    </div>
  </div>

  <!-- Footer -->
  <Footer variant="admin" />
</main>
