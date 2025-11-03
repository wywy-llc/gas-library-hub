<script lang="ts">
  import { about_us, copyright, privacy, terms } from '$lib/paraglide/messages.js';

  // フッターコンポーネント
  // GAS Library Hubのメインフッターで、コピーライトとリンクを表示
  // variant: 'default' | 'admin'を指定して表示形式を切り替え

  interface Props {
    variant?: 'default' | 'admin';
  }

  let { variant = 'default' }: Props = $props();
</script>

{#if variant === 'admin'}
  <!-- 管理画面用のシンプルなフッター -->
  <footer class="footer footer-center bg-base-200 mt-12 p-8">
    <div class="text-sm opacity-70">
      {copyright()}
    </div>
  </footer>
{:else}
  <!-- 通常ページ用のフッター（リンク付き） -->
  <footer class="footer bg-base-100 p-8">
    <div class="container mx-auto">
      <div class="flex flex-col items-center justify-between space-y-4 sm:flex-row sm:space-y-0">
        <!-- コピーライト -->
        <div class="flex flex-col items-center sm:items-start">
          <p class="text-sm opacity-70">
            {copyright()}
          </p>
        </div>

        <!-- ナビゲーションリンク -->
        <nav class="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 sm:justify-end">
          <a
            href="https://wywy.jp/members"
            class="link link-hover text-sm"
            target="_blank"
            rel="noopener noreferrer"
          >
            {about_us()}
          </a>
          <a href="/terms" class="link link-hover text-sm">
            {terms()}
          </a>
          <a href="/privacy" class="link link-hover text-sm">
            {privacy()}
          </a>
        </nav>
      </div>
    </div>
  </footer>
{/if}
