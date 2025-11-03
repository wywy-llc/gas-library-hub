<script lang="ts">
  import type { Locale } from '$lib';
  import { LANGUAGE_NAMES } from '$lib';
  import { getLocale, locales, setLocale } from '$lib/paraglide/runtime.js';
  import { onMount } from 'svelte';

  // localStorageのキー
  const LOCALE_STORAGE_KEY = 'preferred-locale';

  // 現在のロケールを取得
  let currentLocale = $derived(getLocale());

  // ドロップダウンの開閉状態
  let isOpen = $state(false);

  // コンポーネント初期化時にlocalStorageから設定を読み込み
  onMount(() => {
    if (typeof window !== 'undefined') {
      const savedLocale = localStorage.getItem(LOCALE_STORAGE_KEY) as Locale;
      if (savedLocale && locales.includes(savedLocale) && savedLocale !== getLocale()) {
        setLocale(savedLocale);
      }
    }
  });

  // 現在のページのURLを他の言語にローカライズ
  function switchLanguage(newLocale: Locale) {
    setLocale(newLocale);

    // localStorageに保存
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
    }

    isOpen = false; // 言語選択後にドロップダウンを閉じる
  }

  // ドロップダウンの開閉をトグル
  function toggleDropdown() {
    isOpen = !isOpen;
  }

  // 外部クリックでドロップダウンを閉じる
  function handleClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.language-selector')) {
      isOpen = false;
    }
  }
</script>

<svelte:window on:click={handleClickOutside} />

<div class="dropdown language-selector">
  <!-- ヘッダー部分 (クリックで開閉) -->
  <button
    type="button"
    class="btn btn-outline btn-sm flex items-center justify-between"
    onclick={toggleDropdown}
    aria-expanded={isOpen}
    aria-haspopup="listbox"
  >
    <div class="flex items-center">
      <!-- 地球儀アイコン -->
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="mr-2 h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        stroke-width="2"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
        />
      </svg>
      <!-- 選択中の言語を表示 -->
      <span class="text-sm font-medium">
        {LANGUAGE_NAMES[currentLocale] || currentLocale}
      </span>
    </div>
    <!-- 開閉を示す矢印アイコン -->
    <svg
      xmlns="http://www.w3.org/2000/svg"
      class="h-4 w-4 transition-transform duration-200 {isOpen ? 'rotate-180' : ''}"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      stroke-width="2"
    >
      <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  </button>

  <!-- 言語リスト -->
  {#if isOpen}
    <ul
      class="dropdown-content menu bg-base-100 rounded-box z-10 mt-1 w-52 border shadow-lg"
      role="listbox"
    >
      {#each locales as locale (locale)}
        <li>
          <button
            type="button"
            class="text-sm {currentLocale === locale ? 'active' : ''}"
            onclick={() => switchLanguage(locale)}
            role="option"
            aria-selected={currentLocale === locale}
          >
            {LANGUAGE_NAMES[locale as Locale] || locale}
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .rotate-180 {
    transform: rotate(180deg);
  }
</style>
