<script lang="ts">
  import StatusUpdateButtons from '$lib/components/admin/StatusUpdateButtons.svelte';
  import LibrarySummarySection from '$lib/components/LibrarySummarySection.svelte';
  import { LIBRARY_STATUS_BADGE_CLASS, type LibraryStatus } from '$lib/constants/library-status.js';
  import { formatDate, getStatusText } from '$lib/helpers/format.js';
  import { isValidGasWebAppUrl, truncateUrl } from '$lib/helpers/url.js';
  import * as m from '$lib/paraglide/messages.js';
  import { toastStore } from '$lib/stores/toast-store.js';
  import type { LibrarySummaryRecord } from '$lib/types/library-summary.js';

  interface Library {
    id: string;
    name: string;
    scriptId: string;
    repositoryUrl: string;
    authorUrl: string;
    authorName: string;
    description: string;
    licenseType?: string;
    licenseUrl?: string;
    starCount?: number;
    copyCount?: number;
    lastCommitAt: Date;
    status: LibraryStatus;
    scriptType: 'library' | 'web_app';
    createdAt: Date;
    updatedAt: Date;
  }

  interface Form {
    success?: boolean;
    error?: string;
    message?: string;
    newStatus?: string;
  }

  interface Props {
    library: Library;
    librarySummary?: LibrarySummaryRecord | null;
    isAdminMode?: boolean;
    form?: Form;
    onScraping?: () => void;
    onEdit?: () => void;
    onStatusUpdate?: (status: LibraryStatus) => void;
    isScrapingInProgress?: boolean;
    scrapingMessage?: string;
    isStatusUpdateInProgress?: boolean;
    statusMessage?: string;
    isAiSummaryInProgress?: boolean;
    aiSummaryMessage?: string;
    displayCopyCount?: number;
    onCopyScriptId?: () => Promise<void>;
  }

  let {
    library,
    librarySummary,
    isAdminMode = false,
    form,
    onScraping,
    onEdit,
    onStatusUpdate,
    isScrapingInProgress = false,
    scrapingMessage = '',
    isStatusUpdateInProgress = false,
    statusMessage = '',
    isAiSummaryInProgress = false,
    aiSummaryMessage = '',
    displayCopyCount = library.copyCount || 0,
    onCopyScriptId,
  }: Props = $props();

  // scriptTypeに応じてURL生成
  const libraryUrl = `https://script.google.com/macros/library/d/${library.scriptId}/0`;
  const gasProjectUrl = `https://script.google.com/u/1/home/projects/${library.scriptId}/edit`;
  const sampleAppUrl = `https://script.google.com/macros/s/${library.scriptId}/exec`;

  // WebアプリのURLまたはGitHubリポジトリを開く
  function getWebAppUrl(): string {
    if (library.scriptType === 'web_app' && isValidGasWebAppUrl(sampleAppUrl)) {
      return sampleAppUrl;
    }
    return library.repositoryUrl;
  }

  // クリップボードにコピー
  async function copyToClipboard(elementId: string) {
    const input = document.getElementById(elementId) as HTMLInputElement;
    if (input && input.value) {
      try {
        await navigator.clipboard.writeText(input.value);
        toastStore.success(m.copied_success());

        // スクリプトIDがコピーされた場合はコールバックを実行
        if (elementId === 'script-id' && onCopyScriptId) {
          await onCopyScriptId();
        }
      } catch (err) {
        console.error('Copy failed', err);
        toastStore.error(m.copy_failed());
        input.select();
        input.setSelectionRange(0, 99999);
      }
    }
  }

  function getStatusBadge(status: string) {
    return (
      LIBRARY_STATUS_BADGE_CLASS[status as LibraryStatus] ||
      'px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800'
    );
  }
</script>

<div class="container mx-auto px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
  {#if isAdminMode}
    <!-- 管理者モード: ヘッダーにアクションボタン -->
    <div class="mx-auto max-w-3xl">
      <div class="mb-8 flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold text-gray-900">{m.library_detail_title()}</h1>
          <div class="mt-2 flex items-center space-x-3">
            <p class="text-sm text-gray-500">{library.name}</p>
            <span class={getStatusBadge(library.status)}>
              {getStatusText(library.status)}
            </span>
          </div>
        </div>
        <div class="flex space-x-2">
          <button
            type="button"
            onclick={onScraping}
            disabled={isScrapingInProgress}
            class="inline-flex cursor-pointer justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isScrapingInProgress ? m.scraping_in_progress() : m.execute_scraping()}
          </button>
          <button
            type="button"
            onclick={onEdit}
            class="inline-flex cursor-pointer justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            {m.edit()}
          </button>
          <!-- ステータス更新ボタン -->
          {#if onStatusUpdate}
            <StatusUpdateButtons {library} {isStatusUpdateInProgress} {onStatusUpdate} />
          {/if}
        </div>
      </div>

      <!-- スクレイピングメッセージ -->
      {#if scrapingMessage}
        <div class="mb-6 rounded-md bg-blue-50 p-4 text-blue-800">
          {scrapingMessage}
        </div>
      {/if}

      <!-- ステータス更新メッセージ -->
      {#if statusMessage}
        <div
          class="mb-6 rounded-md p-4 {form?.success
            ? 'bg-green-50 text-green-800'
            : 'bg-red-50 text-red-800'}"
        >
          {statusMessage}
        </div>
      {/if}

      <!-- AI要約生成メッセージ -->
      {#if aiSummaryMessage}
        <div class="mb-6 rounded-md bg-purple-50 p-4 text-purple-800">
          <div class="flex items-center">
            {#if isAiSummaryInProgress}
              <svg
                class="mr-2 h-5 w-5 animate-spin text-purple-600"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                ></circle>
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            {:else}
              <svg
                class="mr-2 h-5 w-5 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                ></path>
              </svg>
            {/if}
            {aiSummaryMessage}
          </div>
        </div>
      {/if}
    </div>
  {/if}

  <div class="lg:grid lg:grid-cols-12 lg:gap-8 {isAdminMode ? 'mx-auto max-w-none' : ''}">
    <!-- メインコンテンツ（左カラム） -->
    <div class="lg:col-span-9">
      {#if !isAdminMode}
        <div class="mb-6">
          <h1 class="text-3xl font-bold text-gray-900 sm:text-4xl">
            {library.name}
          </h1>
          <p class="mt-2 text-gray-500">{library.description}</p>
        </div>
      {/if}

      <!-- AI による要約セクション -->
      {#if librarySummary}
        <LibrarySummarySection {librarySummary} libraryName={library.name} {isAdminMode} />
      {/if}

      {#if isAdminMode}
        <!-- 管理者モード: 概要セクション -->
        <div class="mt-12">
          <h2 class="mb-6 text-2xl font-bold text-gray-900">{m.overview()}</h2>
          <div class="overflow-hidden rounded-lg bg-white shadow-md">
            <div class="px-6 py-8">
              <dl class="space-y-8">
                <div>
                  <dt class="text-sm font-medium text-gray-500">{m.library_name()}</dt>
                  <dd class="mt-1 text-lg font-semibold text-gray-900">
                    {library.name}
                  </dd>
                </div>
                <div>
                  <dt class="text-sm font-medium text-gray-500">{m.gas_script_id()}</dt>
                  <dd class="mt-1 font-mono text-base break-all text-gray-900">
                    {library.scriptId}
                  </dd>
                </div>
                <div>
                  <dt class="text-sm font-medium text-gray-500">{m.github_repository_url()}</dt>
                  <dd class="mt-1 text-base text-blue-600 hover:underline">
                    <a href={library.repositoryUrl} target="_blank" rel="noopener noreferrer">
                      {library.repositoryUrl}
                    </a>
                  </dd>
                </div>
                {#if library.scriptType === 'library'}
                  <div>
                    <dt class="text-sm font-medium text-gray-500">{m.gas_methods()}</dt>
                    <dd class="mt-1 text-base text-blue-600 hover:underline">
                      <a
                        href={libraryUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={libraryUrl}
                      >
                        https://script.google.com/macros/library/d/{library.scriptId.slice(-8)}...
                      </a>
                    </dd>
                  </div>
                  <div>
                    <dt class="text-sm font-medium text-gray-500">{m.gas_project()}</dt>
                    <dd class="mt-1 text-base text-blue-600 hover:underline">
                      <a
                        href={gasProjectUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={gasProjectUrl}
                      >
                        https://script.google.com/projects/{library.scriptId.slice(-8)}...
                      </a>
                    </dd>
                  </div>
                {:else if library.scriptType === 'web_app'}
                  <div>
                    <dt class="text-sm font-medium text-gray-500">{m.web_app_execution_url()}</dt>
                    <dd class="mt-1 text-base text-blue-600 hover:underline">
                      <a
                        href={getWebAppUrl()}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={getWebAppUrl()}
                      >
                        {isValidGasWebAppUrl(sampleAppUrl)
                          ? sampleAppUrl
                          : m.open_github_repository()}
                      </a>
                    </dd>
                  </div>
                {/if}
                <div>
                  <dt class="text-sm font-medium text-gray-500">{m.github_author()}</dt>
                  <dd class="mt-1 text-base">
                    {#if library.authorName}
                      <a
                        href={library.authorUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        class="text-blue-600 hover:underline"
                      >
                        {library.authorName}
                      </a>
                    {:else}
                      <a
                        href={library.authorUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        class="text-blue-600 hover:underline"
                      >
                        {library.authorUrl}
                      </a>
                    {/if}
                  </dd>
                </div>
                {#if library.description}
                  <div>
                    <dt class="text-sm font-medium text-gray-500">{m.description()}</dt>
                    <dd class="mt-1 text-base text-gray-900">
                      {library.description}
                    </dd>
                  </div>
                {/if}
                <div>
                  <dt class="text-sm font-medium text-gray-500">{m.license()}</dt>
                  <dd class="mt-1 text-base">
                    {#if library.licenseUrl && library.licenseUrl !== 'unknown'}
                      <a
                        href={library.licenseUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        class="text-blue-600 hover:underline"
                      >
                        {library.licenseType || m.license_info()}
                      </a>
                    {:else}
                      <span class="text-gray-900">
                        {library.licenseType || m.unknown()}
                      </span>
                    {/if}
                  </dd>
                </div>
                <div>
                  <dt class="text-sm font-medium text-gray-500">{m.created_at()}</dt>
                  <dd class="mt-1 text-base text-gray-900">
                    {new Date(library.createdAt).toLocaleString('ja-JP')}
                  </dd>
                </div>
                <div>
                  <dt class="text-sm font-medium text-gray-500">{m.updated_at()}</dt>
                  <dd class="mt-1 text-base text-gray-900">
                    {new Date(library.updatedAt).toLocaleString('ja-JP')}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>

        <!-- SEO情報セクション -->
        {#if librarySummary && (librarySummary.seoTitleJa || librarySummary.seoTitleEn || librarySummary.seoDescriptionJa || librarySummary.seoDescriptionEn)}
          <div class="mt-8">
            <h3 class="mb-4 text-xl font-bold text-gray-900">SEO情報</h3>
            <div class="overflow-hidden rounded-lg bg-white shadow-md">
              <div class="px-6 py-6">
                <dl class="space-y-6">
                  {#if librarySummary.seoTitleJa}
                    <div>
                      <dt class="text-sm font-medium text-gray-500">SEOタイトル（日本語）</dt>
                      <dd class="mt-1 text-base text-gray-900">
                        {librarySummary.seoTitleJa}
                      </dd>
                    </div>
                  {/if}
                  {#if librarySummary.seoTitleEn}
                    <div>
                      <dt class="text-sm font-medium text-gray-500">SEOタイトル（英語）</dt>
                      <dd class="mt-1 text-base text-gray-900">
                        {librarySummary.seoTitleEn}
                      </dd>
                    </div>
                  {/if}
                  {#if librarySummary.seoDescriptionJa}
                    <div>
                      <dt class="text-sm font-medium text-gray-500">SEO説明文（日本語）</dt>
                      <dd class="mt-1 text-base text-gray-900">
                        {librarySummary.seoDescriptionJa}
                      </dd>
                    </div>
                  {/if}
                  {#if librarySummary.seoDescriptionEn}
                    <div>
                      <dt class="text-sm font-medium text-gray-500">SEO説明文（英語）</dt>
                      <dd class="mt-1 text-base text-gray-900">
                        {librarySummary.seoDescriptionEn}
                      </dd>
                    </div>
                  {/if}
                </dl>
              </div>
            </div>
          </div>
        {/if}
      {/if}
    </div>

    <!-- サイドバー（右カラム） -->
    <aside class="mt-8 lg:col-span-3 lg:mt-0">
      <div class="sticky top-24 space-y-6">
        {#if library.scriptType === 'library'}
          <!-- インストールカード -->
          <div class="rounded-lg border p-4">
            <h3 class="mb-3 font-semibold text-gray-800">{m.installation()}</h3>
            <label for="script-id" class="text-sm font-medium text-gray-600">{m.script_id()}</label>
            <div class="mt-1 flex items-center">
              <input
                id="script-id"
                type="text"
                readonly
                value={library.scriptId}
                class="w-full rounded-l-md border bg-gray-50 p-2 text-xs"
              />
              <button
                onclick={() => copyToClipboard('script-id')}
                aria-label={m.copy_script_id_aria()}
                class="rounded-r-md border-t border-r border-b bg-gray-200 p-2 hover:bg-gray-300"
              >
                <svg
                  class="h-5 w-5 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  ></path>
                </svg>
              </button>
            </div>

            <!-- ライセンス情報 -->
            <div class="mt-4 border-t border-gray-200 pt-4">
              <dt class="mb-1 text-sm font-medium text-gray-600">{m.license()}</dt>
              <dd class="text-sm">
                {#if library.licenseUrl && library.licenseUrl !== 'unknown'}
                  <a
                    href={library.licenseUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-blue-600 hover:text-blue-900 hover:underline"
                  >
                    {library.licenseType || m.license_info()}
                  </a>
                {:else}
                  <span class="text-gray-700">
                    {library.licenseType || m.unknown()}
                  </span>
                {/if}
              </dd>
            </div>
          </div>
        {:else if library.scriptType === 'web_app'}
          <!-- Webアプリカード -->
          <div class="rounded-lg border p-4">
            <h3 class="mb-3 font-semibold text-gray-800">Webアプリ</h3>

            {#if isValidGasWebAppUrl(sampleAppUrl)}
              <label for="web-app-url" class="text-sm font-medium text-gray-600"
                >{m.web_app_execution_url()}</label
              >
              <div class="mt-1 flex items-center">
                <input
                  id="web-app-url"
                  type="text"
                  readonly
                  value={sampleAppUrl}
                  class="w-full rounded-l-md border bg-gray-50 p-2 text-xs"
                />
                <button
                  onclick={() => copyToClipboard('web-app-url')}
                  aria-label={`${m.web_app_execution_url()}をコピー`}
                  class="rounded-r-md border-t border-r border-b bg-gray-200 p-2 hover:bg-gray-300"
                >
                  <svg
                    class="h-5 w-5 text-gray-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    ></path>
                  </svg>
                </button>
              </div>
            {:else}
              <p class="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-gray-500">
                {m.invalid_web_app_url_notice()}
              </p>
            {/if}

            <!-- 実行リンク -->
            <div class="mt-3">
              <a
                href={getWebAppUrl()}
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                {#if isValidGasWebAppUrl(sampleAppUrl)}
                  <svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    ></path>
                  </svg>
                  {m.open_web_app()}
                {:else}
                  <svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M10 6H5a2 2 0 00-2 2v3a2 2 0 002 2h2m2 5h8a2 2 0 002-2v-3a2 2 0 00-2-2H9a2 2 0 00-2 2v3a2 2 0 002 2zm8-8V9a2 2 0 00-2-2H9a2 2 0 00-2 2v.01"
                    ></path>
                  </svg>
                  {m.open_github_repository()}
                {/if}
              </a>
            </div>

            <!-- ライセンス情報 -->
            <div class="mt-4 border-t border-gray-200 pt-4">
              <dt class="mb-1 text-sm font-medium text-gray-600">{m.license()}</dt>
              <dd class="text-sm">
                {#if library.licenseUrl && library.licenseUrl !== 'unknown'}
                  <a
                    href={library.licenseUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-blue-600 hover:text-blue-900 hover:underline"
                  >
                    {library.licenseType || m.license_info()}
                  </a>
                {:else}
                  <span class="text-gray-700">
                    {library.licenseType || m.unknown()}
                  </span>
                {/if}
              </dd>
            </div>
          </div>
        {/if}

        <!-- Aboutカード -->
        <div class="rounded-lg border p-4">
          <dl>
            <dt class="font-semibold text-gray-800">{m.github_stars()}</dt>
            <dd class="mb-3">
              <span class="inline-flex items-center">
                <svg class="mr-1 h-4 w-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
                  ></path>
                </svg>
                {library.starCount?.toLocaleString() || 0}
              </span>
            </dd>

            <dt class="font-semibold text-gray-800">{m.last_updated_detail()}</dt>
            <dd class="mb-3">{formatDate(library.lastCommitAt)}</dd>

            {#if !isAdminMode}
              <dt class="font-semibold text-gray-800">{m.script_id_copy_count()}</dt>
              <dd class="mb-3">
                {displayCopyCount}回
              </dd>
            {/if}

            <dt class="font-semibold text-gray-800">{m.author()}</dt>
            <dd class="mb-3">
              <a
                href={library.authorUrl}
                target="_blank"
                rel="noopener noreferrer"
                class="text-blue-600 hover:underline"
              >
                {library.authorName}
              </a>
            </dd>

            {#if library.scriptType === 'library'}
              <dt class="font-semibold text-gray-800">{m.script_reference()}</dt>
              <dd class="mb-3">
                <a
                  href={libraryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-blue-600 hover:underline"
                  title={libraryUrl}
                >
                  {truncateUrl(libraryUrl)}
                </a>
              </dd>

              <!-- GASプロジェクトを追加 -->
              <dt class="font-semibold text-gray-800">{m.gas_project()}</dt>
              <dd class="mb-3">
                <a
                  href={gasProjectUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-blue-600 hover:underline"
                  title={gasProjectUrl}
                >
                  {truncateUrl(gasProjectUrl)}
                </a>
              </dd>
            {:else if library.scriptType === 'web_app' && isValidGasWebAppUrl(sampleAppUrl)}
              <dt class="font-semibold text-gray-800">{m.web_app_execution_url()}</dt>
              <dd class="mb-3">
                <a
                  href={sampleAppUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-blue-600 hover:underline"
                  title={sampleAppUrl}
                >
                  {truncateUrl(sampleAppUrl)}
                </a>
              </dd>
            {/if}

            <dt class="font-semibold text-gray-800">{m.github_repository()}</dt>
            <dd class="mb-3">
              <a
                href={library.repositoryUrl}
                target="_blank"
                rel="noopener noreferrer"
                class="text-blue-600 hover:underline"
                title={library.repositoryUrl}
              >
                {truncateUrl(library.repositoryUrl)}
              </a>
            </dd>
          </dl>
        </div>
      </div>
    </aside>
  </div>
</div>
