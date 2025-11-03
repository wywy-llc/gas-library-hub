<script lang="ts">
  import { getLocale } from '$lib/paraglide/runtime.js'; // cspell:ignore paraglide
  import type { Locale } from '$lib';
  import MarkdownRenderer from '$lib/components/MarkdownRenderer.svelte';
  import TagButton from '$lib/components/TagButton.svelte';
  import * as m from '$lib/paraglide/messages.js';
  import type { LibrarySummaryRecord } from '$lib/types/library-summary.js';

  interface Props {
    librarySummary: LibrarySummaryRecord;
    libraryName: string;
    isAdminMode?: boolean;
  }

  let { librarySummary, libraryName, isAdminMode = false }: Props = $props();

  // Paraglide の現在の言語設定を使用（自動的に更新される） // cspell:ignore Paraglide
  let currentLocale = $derived<Locale>(getLocale());

  // 使用例のマークダウンを取得
  let usageExample = $derived(
    currentLocale === 'ja' ? librarySummary.usageExampleJa : librarySummary.usageExampleEn
  );

  // タグクリック時の検索機能
  function searchByTag(tag: string) {
    window.location.href = `/user/search?q=${encodeURIComponent(tag)}`;
  }
</script>

<!-- AI要約セクション - daisyUI v5準拠 -->
<div class="mt-8">
  <h2 class="mb-6 {isAdminMode ? 'text-2xl font-bold' : 'border-b pb-3 text-2xl font-semibold'}">
    {m.ai_summary()}
  </h2>
  <div class={isAdminMode ? 'card bg-base-100 shadow-lg' : 'card card-border bg-base-100'}>
    <div class={isAdminMode ? 'card-body' : 'card-body'}>
      <!-- ライブラリ名 -->
      <div class="mb-8">
        <h3 class="mb-3 text-lg font-bold">
          {currentLocale === 'ja'
            ? librarySummary.libraryNameJa || libraryName
            : librarySummary.libraryNameEn || libraryName}
        </h3>
        {#if librarySummary.purposeJa || librarySummary.purposeEn}
          <p class="text-sm leading-relaxed opacity-80">
            {#if currentLocale === 'ja'}
              {librarySummary.purposeJa?.includes('公開情報が不足')
                ? librarySummary.seoDescriptionJa
                : librarySummary.purposeJa}
            {:else}
              {librarySummary.purposeEn?.includes('public information')
                ? librarySummary.seoDescriptionEn
                : librarySummary.purposeEn}
            {/if}
          </p>
        {/if}
      </div>

      <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
        <!-- 対象ユーザー - daisyUI v5準拠 -->
        {#if librarySummary.targetUsersJa || librarySummary.targetUsersEn}
          <div class="card card-bordered bg-base-200 shadow-sm">
            <div class="card-body p-4">
              <div class="flex items-start gap-3">
                <div class="flex h-10 w-10 shrink-0 items-center justify-center">
                  <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                    ></path>
                  </svg>
                </div>
                <div>
                  <h4 class="font-semibold">
                    {m.target_users()}
                  </h4>
                  <p class="text-sm leading-relaxed opacity-80">
                    {currentLocale === 'ja'
                      ? librarySummary.targetUsersJa
                      : librarySummary.targetUsersEn}
                  </p>
                </div>
              </div>
            </div>
          </div>
        {/if}

        <!-- 解決する課題 - daisyUI v5準拠 -->
        {#if librarySummary.coreProblemJa || librarySummary.coreProblemEn}
          <div class="card card-bordered bg-base-200 shadow-sm">
            <div class="card-body p-4">
              <div class="flex items-start gap-3">
                <div class="flex h-10 w-10 shrink-0 items-center justify-center">
                  <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                    ></path>
                  </svg>
                </div>
                <div>
                  <h4 class="font-semibold">
                    {m.problems_solved()}
                  </h4>
                  <p class="text-sm leading-relaxed opacity-80">
                    {currentLocale === 'ja'
                      ? librarySummary.coreProblemJa
                      : librarySummary.coreProblemEn}
                  </p>
                </div>
              </div>
            </div>
          </div>
        {/if}
      </div>

      <!-- タグ -->
      {#if (currentLocale === 'ja' ? librarySummary.tagsJa : librarySummary.tagsEn) && (currentLocale === 'ja' ? librarySummary.tagsJa || [] : librarySummary.tagsEn || []).length > 0}
        <div class="my-4">
          <h4 class="mb-3 flex items-center text-base font-semibold">
            <svg class="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
              ></path>
            </svg>
            {m.tags()}
          </h4>
          <div class="flex flex-wrap gap-2">
            {#each currentLocale === 'ja' ? librarySummary.tagsJa || [] : librarySummary.tagsEn || [] as tag, index (index)}
              <TagButton
                size="sm"
                class="shadow-sm"
                onclick={() => searchByTag(tag)}
                title={m.search_by_tag_tooltip({ tag })}
                aria-label={m.search_by_tag_aria({ tag })}
              >
                {tag}
              </TagButton>
            {/each}
          </div>
        </div>
      {/if}

      <!-- 主な特徴 -->
      {#if librarySummary.mainBenefits && librarySummary.mainBenefits.length > 0}
        <div class="mb-8">
          <h4 class="mb-4 flex items-center text-base font-semibold">
            <svg class="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              ></path>
            </svg>
            {m.main_features()}
          </h4>
          <div class="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
            {#each librarySummary.mainBenefits as benefit, index (index)}
              <div class="card card-bordered bg-base-200 shadow-sm">
                <div class="card-body p-4">
                  <div class="mb-2 flex items-center">
                    <div class="mr-3 flex h-8 w-8 items-center justify-center">
                      <span class="text-sm font-semibold">{index + 1}</span>
                    </div>
                    <h5 class="text-base font-semibold">
                      {currentLocale === 'ja' ? benefit.title.ja : benefit.title.en}
                    </h5>
                  </div>
                  <p class="text-sm leading-relaxed opacity-80">
                    {currentLocale === 'ja' ? benefit.description.ja : benefit.description.en}
                  </p>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- 使用例 -->
      {#if usageExample}
        <div class="mb-6">
          <h4 class="mb-4 flex items-center text-base font-semibold">
            <svg class="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
              ></path>
            </svg>
            {m.usage_examples()}
          </h4>
          <MarkdownRenderer content={usageExample} class="shadow-sm" />
        </div>
      {/if}

      <!-- 言語設定はヘッダーの LanguageSwitcher で管理 -->
    </div>
  </div>
</div>
