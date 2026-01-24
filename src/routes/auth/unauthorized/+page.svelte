<script lang="ts">
  import Button from '$lib/components/Button.svelte';
  import { APP_CONFIG } from '$lib/constants/app-config.js';
  import { signOut } from '@auth/sveltekit/client';

  async function handleSignOut() {
    await signOut({ redirectTo: '/' });
  }
</script>

<svelte:head>
  <title>アクセス権限不足 - {APP_CONFIG.SITE_NAME}</title>
</svelte:head>

<div class="flex min-h-screen flex-col justify-center bg-gray-50 py-12 sm:px-6 lg:px-8">
  <div class="sm:mx-auto sm:w-full sm:max-w-md">
    <div class="bg-white px-4 py-8 shadow sm:rounded-lg sm:px-10">
      <div class="text-center">
        <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
          <svg class="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>

        <h2 class="mt-6 text-2xl font-bold text-gray-900">アクセス権限がありません</h2>

        <p class="mt-4 text-sm text-gray-600">
          管理画面にアクセスするための権限がありません。<br />
          管理者権限が必要な場合は、システム管理者にお問い合わせください。
        </p>

        <div class="mt-6 space-y-3">
          <Button variant="outline" class="w-full" href="/">ホームに戻る</Button>

          <Button variant="secondary" class="w-full" onclick={handleSignOut}>ログアウト</Button>
        </div>
      </div>
    </div>
  </div>
</div>
