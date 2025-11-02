<script lang="ts">
  import { next, previous } from '$lib/paraglide/messages.js';

  interface Props {
    currentPage: number;
    totalPages: number;
    getPageUrl: (page: number) => string;
  }

  let { currentPage, totalPages, getPageUrl }: Props = $props();

  // ページ番号の配列を生成
  const pageNumbers = $derived.by(() => {
    if (totalPages <= 7) {
      // 総ページ数が7以下の場合は全ページを表示
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    // 総ページ数が8以上の場合は現在のページを中心とした表示
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);
    const pages: (number | null)[] = [];

    // 最初のページ
    if (startPage > 1) {
      pages.push(1);
      if (startPage > 2) {
        pages.push(null); // 省略記号
      }
    }

    // 現在のページ周辺
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    // 最後のページ
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        pages.push(null); // 省略記号
      }
      pages.push(totalPages);
    }

    return pages;
  });

  const prevPageUrl = $derived(currentPage > 1 ? getPageUrl(currentPage - 1) : '');

  const nextPageUrl = $derived(currentPage < totalPages ? getPageUrl(currentPage + 1) : '');
</script>

<!-- daisyUI v5 Pagination Component -->
<nav class="flex justify-center" aria-label="ページネーション">
  <div class="join">
    <!-- Previous Button -->
    {#if currentPage > 1}
      <a href={prevPageUrl} class="btn btn-outline join-item" aria-label="前のページへ" rel="prev">
        <svg
          class="h-5 w-5"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fill-rule="evenodd"
            d="M18 10a.75.75 0 01-.75.75H4.66l2.1 1.95a.75.75 0 11-1.02 1.1l-3.5-3.25a.75.75 0 010-1.1l3.5-3.25a.75.75 0 111.02 1.1l-2.1 1.95h12.59A.75.75 0 0118 10z"
            clip-rule="evenodd"
          />
        </svg>
        <span class="ml-2 hidden sm:inline">{previous()}</span>
      </a>
    {/if}

    <!-- Page Numbers -->
    <div class="join hidden sm:flex">
      {#each pageNumbers as pageNum, index (index)}
        {#if pageNum === null}
          <button class="btn join-item btn-disabled" disabled>...</button>
        {:else if pageNum === currentPage}
          <button class="btn btn-active join-item" aria-current="page" disabled>
            {pageNum}
          </button>
        {:else}
          <a
            href={getPageUrl(pageNum)}
            class="btn btn-outline join-item"
            aria-label="ページ {pageNum} へ"
          >
            {pageNum}
          </a>
        {/if}
      {/each}
    </div>

    <!-- Current Page (Mobile) -->
    <div class="btn btn-active join-item sm:hidden">
      {currentPage} / {totalPages}
    </div>

    <!-- Next Button -->
    {#if currentPage < totalPages}
      <a href={nextPageUrl} class="btn btn-outline join-item" aria-label="次のページへ" rel="next">
        <span class="mr-2 hidden sm:inline">{next()}</span>
        <svg
          class="h-5 w-5"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fill-rule="evenodd"
            d="M2 10a.75.75 0 01.75-.75h12.59l-2.1-1.95a.75.75 0 111.02-1.1l3.5 3.25a.75.75 0 010 1.1l-3.5 3.25a.75.75 0 11-1.02-1.1l2.1-1.95H2.75A.75.75 0 012 10z"
            clip-rule="evenodd"
          />
        </svg>
      </a>
    {/if}
  </div>
</nav>
