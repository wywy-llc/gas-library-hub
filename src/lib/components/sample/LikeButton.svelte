<script lang="ts">
  import { sample_like_button, sample_liked_button } from '$lib/paraglide/messages.js';

  interface Props {
    liked: boolean;
    count: number;
    disabled?: boolean;
    size?: 'sm' | 'md' | 'lg';
    onClick?: () => void;
  }

  let { liked, count, disabled = false, size = 'md', onClick }: Props = $props();

  let sizeClass = $derived(size === 'sm' ? 'btn-sm' : size === 'lg' ? 'btn-lg' : '');
</script>

<button
  type="button"
  class="btn btn-ghost gap-1 {sizeClass}"
  class:text-error={liked}
  {disabled}
  onclick={onClick}
  title={liked ? sample_liked_button() : sample_like_button()}
>
  <span class="text-lg">{liked ? '❤️' : '🤍'}</span>
  <span>{count}</span>
</button>
