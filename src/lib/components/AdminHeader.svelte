<script lang="ts">
  import { library_management } from '$lib/paraglide/messages.js';
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
  <div class="container mx-auto px-1 sm:px-2 lg:px-4">
    <div class="flex h-16 items-center justify-between">
      <!-- ロゴとナビゲーション -->
      <div class="flex items-center space-x-8">
        <a href="/admin" class="flex items-center">
          <img src="/logo.png" alt="GAS Library Hub" class="h-16 w-auto" />
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
