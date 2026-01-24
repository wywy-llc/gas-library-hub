<script lang="ts">
  import { app_title, library_management } from '$lib/paraglide/messages.js';
  import LanguageSwitcher from './LanguageSwitcher.svelte';
  import UserDropdown from './UserDropdown.svelte';

  // 管理者用ヘッダーコンポーネント
  // 管理者専用ナビゲーションとユーザードロップダウンを含む

  type Props = {
    user: { name?: string; email?: string; image?: string };
  };

  let { user }: Props = $props();
</script>

<header class="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-sm">
  <div class="container mx-auto px-4 sm:px-6 lg:px-8">
    <div class="flex h-16 items-center justify-between">
      <!-- ロゴとナビゲーション -->
      <div class="flex items-center space-x-8">
        <a href="/admin" class="flex items-center space-x-2 text-xl font-bold text-gray-900">
          <img src="/logo.png" alt={app_title()} class="h-8 w-8" />
          <span>{app_title()}</span>
        </a>

        <!-- 管理者ナビゲーション -->
        <nav class="flex items-center space-x-4">
          <a
            href="/admin/libraries"
            class="text-sm font-medium text-gray-600 transition-colors hover:text-blue-600"
          >
            {library_management()}
          </a>
        </nav>
      </div>

      <!-- 右側のアクション -->
      <div class="flex items-center space-x-4">
        <LanguageSwitcher />
        <UserDropdown {user} showAdminLink={true} />
      </div>
    </div>
  </div>
</header>
