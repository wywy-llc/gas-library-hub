<script lang="ts">
  import { goto } from '$app/navigation';
  import { search_placeholder, header_search } from '$lib/paraglide/messages.js';

  // GASライブラリ検索コンポーネント
  // トップページとサーチページで共通利用されるレスポンシブ検索ボックス

  // Props
  export let placeholder = search_placeholder();
  export let value = '';
  export let size: 'small' | 'large' = 'large';

  // 検索実行
  function handleSearch(event: Event) {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);
    const query = formData.get('q') as string;

    if (query.trim()) {
      goto(`/user/search?q=${encodeURIComponent(query.trim())}`);
    }
  }

  // サイズによるdaisyUIクラス切り替え
  $: inputClasses =
    size === 'large'
      ? 'input input-bordered w-full pl-12 input-lg'
      : 'input input-bordered w-full pl-10';

  $: iconContainerClasses =
    size === 'large'
      ? 'pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4'
      : 'pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3';
</script>

<form class="relative" on:submit={handleSearch}>
  <div class={iconContainerClasses}>
    <svg
      class="h-6 w-6 text-gray-400"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fill-rule="evenodd"
        d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
        clip-rule="evenodd"
      />
    </svg>
  </div>
  <input
    type="search"
    name="q"
    id="search"
    class={inputClasses}
    {placeholder}
    bind:value
    aria-label={header_search()}
  />
</form>
