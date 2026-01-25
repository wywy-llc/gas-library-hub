<script lang="ts">
  import Footer from '$lib/components/Footer.svelte';
  import GoogleAnalytics from '$lib/components/GoogleAnalytics.svelte';
  import Header from '$lib/components/Header.svelte';
  import UserHeader from '$lib/components/UserHeader.svelte';

  // ユーザー向けページ用レイアウト
  // ログイン状態に応じてヘッダーを切り替え

  let { children, data } = $props();

  let session = $derived(data.session);
  let user = $derived(data.user);
  let isLoggedIn = $derived(session && user);
</script>

<div class="flex min-h-screen flex-col">
  <!-- Skip to main content link for accessibility -->
  <a
    href="#main-content"
    class="btn btn-primary sr-only z-50 focus:not-sr-only focus:absolute focus:top-4 focus:left-4"
  >
    メインコンテンツにスキップ
  </a>

  <header>
    {#if isLoggedIn}
      <UserHeader
        user={user && 'name' in user && 'email' in user && 'picture' in user
          ? {
              name: String(user.name),
              email: String(user.email),
              image: typeof user.picture === 'string' ? user.picture : undefined,
            }
          : { name: '', email: '', image: '' }}
        showAdminLink={false}
      />
    {:else}
      <Header />
    {/if}
  </header>
  <GoogleAnalytics />

  <main class="flex-1" id="main-content">
    {@render children()}
  </main>

  <footer>
    <Footer />
  </footer>
</div>
