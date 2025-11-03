<script lang="ts">
  import { signIn } from '@auth/sveltekit/client';
  import {
    free_account_create,
    gas_library_add_available,
    google_button,
    account_create_terms,
    account_create_terms_agree,
    already_have_account,
    login_here,
    login_suffix,
    terms,
    privacy,
  } from '$lib/paraglide/messages.js';

  interface Props {
    redirectTo?: string;
  }

  let { redirectTo = '/user' }: Props = $props();

  let isHovered = $state(false);

  async function handleGoogleRegister() {
    await signIn('google', { redirectTo });
  }
</script>

<div class="card card-bordered bg-base-100 mx-auto max-w-md shadow-xl">
  <div class="card-body">
    <h2 class="card-title mb-6 justify-center text-2xl">{free_account_create()}</h2>

    <div class="space-y-4">
      <p class="text-center text-sm opacity-70">{gas_library_add_available()}</p>

      <button
        onclick={handleGoogleRegister}
        onmouseenter={() => (isHovered = true)}
        onmouseleave={() => (isHovered = false)}
        class="btn btn-outline btn-block gap-3"
      >
        <!-- Googleアイコン（ホバー時にスケールとパルスエフェクト） -->
        <svg
          class="h-5 w-5 transition-all duration-200 {isHovered
            ? 'scale-110 animate-pulse'
            : 'scale-100'}"
          viewBox="0 0 24 24"
        >
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        <span>{google_button()}</span>
      </button>

      <div class="mt-6 text-center">
        <p class="text-xs opacity-70">
          {account_create_terms()}
          <a href="/terms" class="link link-primary">{terms()}</a>
          および
          <a href="/privacy" class="link link-primary">
            {privacy()}
          </a>
          {account_create_terms_agree()}
        </p>
      </div>

      <div class="divider"></div>

      <div class="text-center">
        <p class="text-sm opacity-70">
          {already_have_account()}
          <a href="/auth/login" class="link link-primary">{login_here()}</a>
          {login_suffix()}
        </p>
      </div>
    </div>
  </div>
</div>
