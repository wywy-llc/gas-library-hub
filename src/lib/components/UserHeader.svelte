<script lang="ts">
  import { gas_library_add } from '$lib/paraglide/messages.js';
  import LanguageSwitcher from './LanguageSwitcher.svelte';
  import UserDropdown from './UserDropdown.svelte';

  // ログインユーザー用ヘッダーコンポーネント
  // ユーザードロップダウンメニューを含む

  type Props = {
    user: { name?: string; email?: string; image?: string };
    showAdminLink?: boolean;
  };

  let { user, showAdminLink = false }: Props = $props();

  let isMenuOpen = $state(false);

  function toggleMenu() {
    isMenuOpen = !isMenuOpen;
  }

  function closeMenu() {
    isMenuOpen = false;
  }
</script>

<header class="navbar bg-base-100/80 sticky top-0 z-50 backdrop-blur-sm">
  <div class="container mx-auto px-1 sm:px-2 lg:px-4">
    <div class="flex h-16 items-center justify-between">
      <!-- ロゴ -->
      <div class="flex items-center">
        <a href="/user" class="flex items-center">
          <img src="/logo.png" alt="GAS Library Hub" class="h-16 w-auto" />
        </a>
      </div>

      <!-- デスクトップメニュー -->
      <div class="hidden items-center space-x-4 md:flex">
        <!-- ライブラリ申請リンク -->
        <a href="/user/libraries/request" class="btn btn-primary btn-sm">
          {gas_library_add()}
        </a>
        <LanguageSwitcher />
        <UserDropdown {user} {showAdminLink} />
      </div>

      <!-- モバイルハンバーガーボタン -->
      <div class="md:hidden">
        <button
          onclick={toggleMenu}
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
          <!-- ライブラリ申請リンク -->
          <a href="/user/libraries/request" onclick={closeMenu} class="btn btn-primary btn-block">
            {gas_library_add()}
          </a>

          <!-- 言語切り替え -->
          <div class="px-3 py-2">
            <LanguageSwitcher />
          </div>

          <!-- ユーザードロップダウン -->
          <div class="px-3 py-2">
            <UserDropdown {user} {showAdminLink} />
          </div>
        </div>
      </div>
    {/if}
  </div>
</header>
