<script lang="ts">
  import type { Snippet } from 'svelte';

  /**
   * 再利用可能なボタンコンポーネント
   * プライマリ、セカンダリ、アウトラインバリアントをサポート
   */

  type Props = {
    variant?: 'primary' | 'secondary' | 'outline';
    size?: 'sm' | 'md' | 'lg';
    href?: string;
    disabled?: boolean;
    type?: 'button' | 'submit' | 'reset';
    fullWidth?: boolean;
    class?: string;
    onclick?: (event: MouseEvent) => void;
    children?: Snippet;
  };

  let {
    variant = 'primary',
    size = 'md',
    href = undefined,
    disabled = false,
    type = 'button',
    fullWidth = false,
    class: className = '',
    onclick,
    children,
  }: Props = $props();

  // バリアント別のdaisyUIクラス定義
  const variantStyles = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    outline: 'btn-outline',
  };

  // サイズ別のdaisyUIクラス定義
  const sizeStyles = {
    sm: 'btn-sm',
    md: 'btn-md',
    lg: 'btn-lg',
  };

  // 最終的なクラス名を構築
  const buttonClasses = $derived(
    ['btn', variantStyles[variant], sizeStyles[size], fullWidth ? 'btn-block' : '', className]
      .filter(Boolean)
      .join(' ')
  );
</script>

{#if href}
  <a {href} class={buttonClasses} class:pointer-events-none={disabled} {onclick}>
    {@render children?.()}
  </a>
{:else}
  <button {type} {disabled} class={buttonClasses} {onclick}>
    {@render children?.()}
  </button>
{/if}
