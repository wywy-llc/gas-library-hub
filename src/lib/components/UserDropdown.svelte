<script lang="ts">
  import { clickOutside } from '$lib/actions/clickOutside';
  import {
    admin_dashboard,
    library_search,
    logout,
    user_menu_dashboard,
    user_menu_my_samples,
  } from '$lib/paraglide/messages.js';
  import { signOut } from '@auth/sveltekit/client';

  type Props = {
    user: { name?: string; email?: string };
    showAdminLink?: boolean;
  };

  let { user, showAdminLink = false }: Props = $props();

  let isOpen = $state(false);

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

<div class="dropdown dropdown-end">
  <!-- ユーザー名ボタン -->
  <button onclick={toggleDropdown} class="btn btn-ghost btn-sm">
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
    <ul
      use:clickOutside={closeDropdown}
      class="dropdown-content menu bg-base-100 rounded-box z-50 mt-2 w-52 border shadow-lg"
    >
      {#if showAdminLink}
        <li>
          <a href="/admin" onclick={closeDropdown}>
            {admin_dashboard()}
          </a>
        </li>
        <li class="menu-title">
          <hr />
        </li>
      {/if}
      <li>
        <a href="/user/dashboard" onclick={closeDropdown}>
          {user_menu_dashboard()}
        </a>
      </li>
      <li>
        <a href="/user/samples" onclick={closeDropdown}>
          {user_menu_my_samples()}
        </a>
      </li>
      <li>
        <a href="/user/search" onclick={closeDropdown}>
          {library_search()}
        </a>
      </li>
      <li class="menu-title">
        <hr />
      </li>
      <li>
        <button onclick={handleSignOut} class="w-full text-left">
          {logout()}
        </button>
      </li>
    </ul>
  {/if}
</div>
