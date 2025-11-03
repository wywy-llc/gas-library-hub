<script lang="ts">
  import { clickOutside } from '$lib/actions/clickOutside';
  import { admin_dashboard, library_search, logout } from '$lib/paraglide/messages.js';
  import { signOut } from '@auth/sveltekit/client';

  export let user: { name?: string; email?: string; image?: string };
  export let showAdminLink = false;

  let isOpen = false;

  function toggleDropdown() {
    isOpen = !isOpen;
  }

  function closeDropdown() {
    isOpen = false;
  }

  async function handleSignOut() {
    await signOut({ redirectTo: '/' });
    closeDropdown();
  }
</script>

<div class="relative">
  <!-- ユーザー名ボタン -->
  <button
    on:click={toggleDropdown}
    class="flex items-center space-x-2 rounded-md px-2 py-1 text-sm font-medium text-gray-700 transition-colors hover:text-gray-900 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
  >
    <span>{user.name || user.email}</span>
    <svg
      class="h-4 w-4 transition-transform {isOpen ? 'rotate-180' : ''}"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
    </svg>
  </button>

  <!-- ドロップダウンメニュー -->
  {#if isOpen}
    <div
      use:clickOutside={closeDropdown}
      class="ring-opacity-5 absolute right-0 z-50 mt-2 w-48 rounded-md bg-white shadow-lg focus:outline-none"
    >
      <div class="py-1">
        {#if showAdminLink}
          <a
            href="/admin"
            class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
            on:click={closeDropdown}
          >
            {admin_dashboard()}
          </a>
        {/if}
        <a
          href="/user/search"
          class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
          on:click={closeDropdown}
        >
          {library_search()}
        </a>
        <hr class="my-1 border-gray-200" />
        <button
          on:click={handleSignOut}
          class="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
        >
          {logout()}
        </button>
      </div>
    </div>
  {/if}
</div>
