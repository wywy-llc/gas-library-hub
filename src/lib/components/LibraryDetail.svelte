<script lang="ts">
  import StatusUpdateButtons from '$lib/components/admin/StatusUpdateButtons.svelte';
  import LibrarySummarySection from '$lib/components/LibrarySummarySection.svelte';
  import { LIBRARY_STATUS_BADGE_CLASS, type LibraryStatus } from '$lib/constants/library-status.js';
  import { formatDate, getStatusText } from '$lib/helpers/format.js';
  import { isValidGasWebAppUrl } from '$lib/helpers/url.js';
  import * as m from '$lib/paraglide/messages.js';
  import { toastStore } from '$lib/stores/toast-store.js';
  import type { LibrarySummaryRecord } from '$lib/types/library-summary.js';
  import type { ScriptValidationStatus } from '$lib/server/utils/gas-script-validator.js';

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
    scriptValidationStatus?: ScriptValidationStatus | null;
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

  // scriptTypeに応じてURL生成（propsの変更に追従するため$derivedを使用）
  const libraryUrl = $derived(`https://script.google.com/macros/library/d/${library.scriptId}/0`);
  const gasProjectUrl = $derived(
    `https://script.google.com/u/1/home/projects/${library.scriptId}/edit`
  );
  const sampleAppUrl = $derived(`https://script.google.com/macros/s/${library.scriptId}/exec`);

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

  // スクリプト検証ステータスに基づく警告表示
  const hasValidationWarning = $derived(
    library.scriptValidationStatus === 'inaccessible' ||
      library.scriptValidationStatus === 'not_found'
  );

  const validationWarningMessage = $derived(() => {
    if (library.scriptValidationStatus === 'inaccessible') {
      return m.script_validation_inaccessible();
    }
    if (library.scriptValidationStatus === 'not_found') {
      return m.script_validation_not_found();
    }
    return '';
  });
</script>

<div class="container mx-auto px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
  {#if isAdminMode}
    <!-- 管理者モード: ヘッダーにアクションボタン -->
    <div class="mx-auto max-w-3xl">
      <div class="mb-8 flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold">{m.library_detail_title()}</h1>
          <div class="mt-2 flex items-center space-x-3">
            <p class="text-sm opacity-70">{library.name}</p>
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
            class="btn btn-outline btn-sm"
          >
            {isScrapingInProgress ? m.scraping_in_progress() : m.execute_scraping()}
          </button>
          <button type="button" onclick={onEdit} class="btn btn-outline btn-sm">
            {m.edit()}
          </button>
          <!-- ステータス更新ボタン -->
          {#if onStatusUpdate}
            <StatusUpdateButtons {library} {isStatusUpdateInProgress} {onStatusUpdate} />
          {/if}
        </div>
      </div>

      <!-- スクレイピングメッセージ - daisyUI v5準拠 -->
      {#if scrapingMessage}
        <div class="alert alert-info mb-6">
          {scrapingMessage}
        </div>
      {/if}

      <!-- ステータス更新メッセージ - daisyUI v5準拠 -->
      {#if statusMessage}
        <div class="alert mb-6 {form?.success ? 'alert-success' : 'alert-error'}">
          {statusMessage}
        </div>
      {/if}

      <!-- AI要約生成メッセージ - daisyUI v5準拠 -->
      {#if aiSummaryMessage}
        <div class="alert alert-info mb-6">
          <div class="flex items-center">
            {#if isAiSummaryInProgress}
              <span class="loading loading-spinner loading-md mr-2"></span>
            {:else}
              <svg class="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          <h1 class="text-3xl font-bold sm:text-4xl">
            {library.name}
          </h1>
          <p class="mt-2 opacity-70">{library.description}</p>
        </div>
      {/if}

      <!-- AI による要約セクション -->
      {#if librarySummary}
        <LibrarySummarySection {librarySummary} libraryName={library.name} {isAdminMode} />
      {/if}

      {#if isAdminMode}
        <!-- 管理者モード: 概要セクション - daisyUI v5準拠 -->
        <div class="mt-12">
          <h2 class="mb-6 text-2xl font-bold">{m.overview()}</h2>
          <div class="card bg-base-200 shadow-lg">
            <div class="card-body">
              <dl class="space-y-8">
                <div>
                  <dt class="text-sm font-medium opacity-70">{m.library_name()}</dt>
                  <dd class="mt-1 text-lg font-semibold">
                    {library.name}
                  </dd>
                </div>
                <div>
                  <dt class="text-sm font-medium opacity-70">{m.gas_script_id()}</dt>
                  <dd class="mt-1 font-mono text-base break-all">
                    {library.scriptId}
                  </dd>
                </div>
                <div>
                  <dt class="text-sm font-medium opacity-70">{m.github_repository_url()}</dt>
                  <dd class="mt-1 text-base">
                    <a
                      href={library.repositoryUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      class="link link-primary"
                    >
                      {library.repositoryUrl}
                    </a>
                  </dd>
                </div>
                {#if library.scriptType === 'library'}
                  <div>
                    <dt class="text-sm font-medium opacity-70">{m.gas_methods()}</dt>
                    <dd class="mt-1 text-base">
                      <a
                        href={libraryUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={libraryUrl}
                        class="link link-primary"
                      >
                        https://script.google.com/macros/library/d/{library.scriptId.slice(-8)}...
                      </a>
                    </dd>
                  </div>
                  <div>
                    <dt class="text-sm font-medium opacity-70">{m.gas_project()}</dt>
                    <dd class="mt-1 text-base">
                      <a
                        href={gasProjectUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={gasProjectUrl}
                        class="link link-primary"
                      >
                        https://script.google.com/projects/{library.scriptId.slice(-8)}...
                      </a>
                    </dd>
                  </div>
                {:else if library.scriptType === 'web_app'}
                  <div>
                    <dt class="text-sm font-medium opacity-70">{m.web_app_execution_url()}</dt>
                    <dd class="mt-1 text-base">
                      <a
                        href={getWebAppUrl()}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={getWebAppUrl()}
                        class="link link-primary"
                      >
                        {isValidGasWebAppUrl(sampleAppUrl)
                          ? sampleAppUrl
                          : m.open_github_repository()}
                      </a>
                    </dd>
                  </div>
                {/if}
                <div>
                  <dt class="text-sm font-medium opacity-70">{m.github_author()}</dt>
                  <dd class="mt-1 text-base">
                    {#if library.authorName}
                      <a
                        href={library.authorUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        class="link link-primary"
                      >
                        {library.authorName}
                      </a>
                    {:else}
                      <a
                        href={library.authorUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        class="link link-primary"
                      >
                        {library.authorUrl}
                      </a>
                    {/if}
                  </dd>
                </div>
                {#if library.description}
                  <div>
                    <dt class="text-sm font-medium opacity-70">{m.description()}</dt>
                    <dd class="mt-1 text-base">
                      {library.description}
                    </dd>
                  </div>
                {/if}
                <div>
                  <dt class="text-sm font-medium opacity-70">{m.license()}</dt>
                  <dd class="mt-1 text-base">
                    {#if library.licenseUrl && library.licenseUrl !== 'unknown'}
                      <a
                        href={library.licenseUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        class="link link-primary"
                      >
                        {library.licenseType || m.license_info()}
                      </a>
                    {:else}
                      <span>
                        {library.licenseType || m.unknown()}
                      </span>
                    {/if}
                  </dd>
                </div>
                <div>
                  <dt class="text-sm font-medium opacity-70">{m.created_at()}</dt>
                  <dd class="mt-1 text-base">
                    {new Date(library.createdAt).toLocaleString('ja-JP')}
                  </dd>
                </div>
                <div>
                  <dt class="text-sm font-medium opacity-70">{m.updated_at()}</dt>
                  <dd class="mt-1 text-base">
                    {new Date(library.updatedAt).toLocaleString('ja-JP')}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>

        <!-- SEO情報セクション - daisyUI v5準拠 -->
        {#if librarySummary && (librarySummary.seoTitleJa || librarySummary.seoTitleEn || librarySummary.seoDescriptionJa || librarySummary.seoDescriptionEn)}
          <div class="mt-8">
            <h3 class="mb-4 text-xl font-bold">SEO情報</h3>
            <div class="card bg-base-200shadow-lg">
              <div class="card-body">
                <dl class="space-y-6">
                  {#if librarySummary.seoTitleJa}
                    <div>
                      <dt class="text-sm font-medium opacity-70">SEOタイトル（日本語）</dt>
                      <dd class="mt-1 text-base">
                        {librarySummary.seoTitleJa}
                      </dd>
                    </div>
                  {/if}
                  {#if librarySummary.seoTitleEn}
                    <div>
                      <dt class="text-sm font-medium opacity-70">SEOタイトル（英語）</dt>
                      <dd class="mt-1 text-base">
                        {librarySummary.seoTitleEn}
                      </dd>
                    </div>
                  {/if}
                  {#if librarySummary.seoDescriptionJa}
                    <div>
                      <dt class="text-sm font-medium opacity-70">SEO説明文（日本語）</dt>
                      <dd class="mt-1 text-base">
                        {librarySummary.seoDescriptionJa}
                      </dd>
                    </div>
                  {/if}
                  {#if librarySummary.seoDescriptionEn}
                    <div>
                      <dt class="text-sm font-medium opacity-70">SEO説明文（英語）</dt>
                      <dd class="mt-1 text-base">
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
          <!-- インストールカード - daisyUI v5準拠 -->
          <div class="card card-border bg-base-200 p-4">
            <h3 class="mb-3 font-semibold">{m.installation()}</h3>
            <label for="script-id" class="text-sm font-medium opacity-70">{m.script_id()}</label>
            <div class="join mt-1 w-full">
              <input
                id="script-id"
                type="text"
                readonly
                value={library.scriptId}
                class="input input-bordered input-sm join-item flex-1 font-mono text-xs"
              />
              <button
                onclick={() => copyToClipboard('script-id')}
                aria-label={m.copy_script_id_aria()}
                class="btn btn-primary btn-sm join-item"
              >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  ></path>
                </svg>
                {m.copy_button()}
              </button>
            </div>

            <!-- スクリプト検証警告 -->
            {#if hasValidationWarning}
              <div class="alert alert-warning mt-3 text-sm">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-5 w-5 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <span>{validationWarningMessage()}</span>
              </div>
            {/if}

            <!-- クイックリンク - daisyUI v5 btn-ghost -->
            <div class="divider"></div>
            <div class="space-y-1">
              <a
                href={libraryUrl}
                target="_blank"
                rel="noopener noreferrer"
                class="btn btn-ghost btn-sm w-full justify-between px-2 {hasValidationWarning
                  ? 'opacity-60'
                  : ''}"
                title={libraryUrl}
              >
                <span class="flex items-center gap-2">
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    ></path>
                  </svg>
                  {m.script_reference()}
                  {#if hasValidationWarning}
                    <svg class="text-warning h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fill-rule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clip-rule="evenodd"
                      />
                    </svg>
                  {/if}
                </span>
                <svg
                  class="h-4 w-4 opacity-50"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 5l7 7-7 7"
                  ></path>
                </svg>
              </a>
              <a
                href={gasProjectUrl}
                target="_blank"
                rel="noopener noreferrer"
                class="btn btn-ghost btn-sm w-full justify-between px-2 {hasValidationWarning
                  ? 'opacity-60'
                  : ''}"
                title={gasProjectUrl}
              >
                <span class="flex items-center gap-2">
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    ></path>
                  </svg>
                  {m.gas_project()}
                  {#if hasValidationWarning}
                    <svg class="text-warning h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fill-rule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clip-rule="evenodd"
                      />
                    </svg>
                  {/if}
                </span>
                <svg
                  class="h-4 w-4 opacity-50"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 5l7 7-7 7"
                  ></path>
                </svg>
              </a>
              <a
                href={library.repositoryUrl}
                target="_blank"
                rel="noopener noreferrer"
                class="btn btn-ghost btn-sm w-full justify-between px-2"
                title={library.repositoryUrl}
              >
                <span class="flex items-center gap-2">
                  <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path
                      d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
                    ></path>
                  </svg>
                  {m.github_repository()}
                </span>
                <svg
                  class="h-4 w-4 opacity-50"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 5l7 7-7 7"
                  ></path>
                </svg>
              </a>
            </div>
          </div>
        {:else if library.scriptType === 'web_app'}
          <!-- Webアプリカード - daisyUI v5準拠 -->
          <div class="card card-border bg-base-200 p-4">
            <h3 class="mb-3 font-semibold">Webアプリ</h3>

            {#if isValidGasWebAppUrl(sampleAppUrl)}
              <label for="web-app-url" class="text-sm font-medium opacity-70"
                >{m.web_app_execution_url()}</label
              >
              <div class="join mt-1 w-full">
                <input
                  id="web-app-url"
                  type="text"
                  readonly
                  value={sampleAppUrl}
                  class="input input-bordered input-sm join-item flex-1 font-mono text-xs"
                />
                <button
                  onclick={() => copyToClipboard('web-app-url')}
                  aria-label={`${m.web_app_execution_url()}をコピー`}
                  class="btn btn-primary btn-sm join-item"
                >
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    ></path>
                  </svg>
                  {m.copy_button()}
                </button>
              </div>
            {:else}
              <div class="alert alert-warning text-sm">
                {m.invalid_web_app_url_notice()}
              </div>
            {/if}

            <!-- 実行リンク - daisyUI v5準拠 -->
            <div class="mt-3">
              <a
                href={getWebAppUrl()}
                target="_blank"
                rel="noopener noreferrer"
                class="btn btn-primary btn-sm w-full"
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

            <!-- ライセンス情報 - daisyUI v5準拠 -->
            <div class="divider"></div>
            <div>
              <dt class="mb-1 text-sm font-medium opacity-70">{m.license()}</dt>
              <dd class="text-sm">
                {#if library.licenseUrl && library.licenseUrl !== 'unknown'}
                  <a
                    href={library.licenseUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="link link-primary"
                  >
                    {library.licenseType || m.license_info()}
                  </a>
                {:else}
                  <span>
                    {library.licenseType || m.unknown()}
                  </span>
                {/if}
              </dd>
            </div>
          </div>
        {/if}

        <!-- Aboutカード - daisyUI v5準拠 -->
        <div class="card card-border bg-base-200 p-4">
          <dl>
            <dt class="font-semibold">{m.github_stars()}</dt>
            <dd class="mb-3">
              <span class="inline-flex items-center">
                <svg class="text-warning mr-1 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
                  ></path>
                </svg>
                {library.starCount?.toLocaleString() || 0}
              </span>
            </dd>

            <dt class="font-semibold">{m.last_updated_detail()}</dt>
            <dd class="mb-3">{formatDate(library.lastCommitAt)}</dd>

            {#if !isAdminMode}
              <dt class="font-semibold">{m.script_id_copy_count()}</dt>
              <dd class="mb-3">
                {displayCopyCount}回
              </dd>
            {/if}

            <dt class="font-semibold">{m.author()}</dt>
            <dd class="mb-3">
              <a
                href={library.authorUrl}
                target="_blank"
                rel="noopener noreferrer"
                class="link link-primary"
              >
                {library.authorName}
              </a>
            </dd>

            <dt class="font-semibold">{m.license()}</dt>
            <dd>
              {#if library.licenseUrl && library.licenseUrl !== 'unknown'}
                <a
                  href={library.licenseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="link link-primary"
                >
                  {library.licenseType || m.license_info()}
                </a>
              {:else}
                <span>
                  {library.licenseType || m.unknown()}
                </span>
              {/if}
            </dd>
          </dl>
        </div>
      </div>
    </aside>
  </div>
</div>
