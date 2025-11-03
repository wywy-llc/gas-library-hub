<script lang="ts">
  import { app_title, gas_library_add, login } from '$lib/paraglide/messages.js';
  import Button from './Button.svelte';
  import GoogleAnalytics from './GoogleAnalytics.svelte';
  import LanguageSwitcher from './LanguageSwitcher.svelte';

  // 基本ヘッダーコンポーネント
  // 未ログインユーザー向けのシンプルなヘッダー

  let isMenuOpen = false;

  const toggleMenu = () => {
    isMenuOpen = !isMenuOpen;
  };

  const closeMenu = () => {
    isMenuOpen = false;
  };
</script>

<header class="navbar bg-base-100/80 sticky top-0 z-50 border-b backdrop-blur-sm">
  <div class="container mx-auto px-4 sm:px-6 lg:px-8">
    <div class="flex h-16 items-center justify-between">
      <!-- ロゴ -->
      <div class="flex items-center">
        <a href="/" class="flex items-center space-x-2 text-xl font-bold">
          <img src="/logo.png" alt={app_title()} class="h-8 w-8" />
          <span class="hidden sm:block">{app_title()}</span>
          <span class="block text-lg sm:hidden">{app_title()}</span>
        </a>
      </div>

      <!-- デスクトップメニュー -->
      <div class="hidden items-center space-x-4 md:flex">
        <!-- GASライブラリ追加リンク -->
        <a href="/auth/register?redirect=/user/libraries/request" class="btn btn-primary btn-sm">
          {gas_library_add()}
        </a>
        <LanguageSwitcher />
        <Button variant="primary" size="md" href="/auth/login">{login()}</Button>
      </div>

      <!-- モバイルハンバーガーボタン -->
      <div class="md:hidden">
        <button
          on:click={toggleMenu}
          type="button"
          class="btn btn-ghost btn-square btn-sm"
          aria-controls="mobile-menu"
          aria-expanded={isMenuOpen}
          aria-label="メニューを開く"
        >
          <span class="sr-only">メニューを開く</span>
          <!-- ハンバーガーアイコン -->
          <svg
            class="h-6 w-6 transition-transform duration-300 {isMenuOpen ? 'rotate-90' : ''}"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
          >
            {#if !isMenuOpen}
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
              />
            {:else}
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            {/if}
          </svg>
        </button>
      </div>
    </div>

    <!-- モバイルメニュー -->
    {#if isMenuOpen}
      <div class="md:hidden" id="mobile-menu">
        <div class="menu bg-base-100 space-y-1 rounded-b-lg border-t p-2 shadow-lg">
          <!-- GASライブラリ追加リンク -->
          <a
            href="/auth/register?redirect=/user/libraries/request"
            on:click={closeMenu}
            class="btn btn-primary btn-block"
          >
            {gas_library_add()}
          </a>

          <!-- 言語切り替え -->
          <div class="px-3 py-2">
            <LanguageSwitcher />
          </div>

          <!-- ログインボタン -->
          <div class="px-3 py-2">
            <Button variant="primary" size="md" href="/auth/login" class="w-full">{login()}</Button>
          </div>
        </div>
      </div>
    {/if}
  </div>
</header>

<GoogleAnalytics />
