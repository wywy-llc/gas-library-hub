<script lang="ts">
  import { sample_copy_button } from '$lib/paraglide/messages.js';

  interface Props {
    copyUrl: string;
    count?: number;
    size?: 'sm' | 'md' | 'lg';
    onClick?: () => void;
  }

  let { copyUrl, count, size = 'md', onClick }: Props = $props();

  let sizeClass = $derived(size === 'sm' ? 'btn-sm' : size === 'lg' ? 'btn-lg' : '');

  function handleClick() {
    onClick?.();
  }
</script>

<a
  href={copyUrl}
  target="_blank"
  rel="noopener noreferrer"
  class="btn btn-primary gap-1 {sizeClass}"
  onclick={handleClick}
>
  <span>📋</span>
  <span>{sample_copy_button()}</span>
  {#if count !== undefined}
    <span class="badge badge-sm">{count}</span>
  {/if}
</a>
