<script lang="ts">
  /**
   * 再利用可能なボタンコンポーネント
   * プライマリ、セカンダリ、アウトラインバリアントをサポート
   */

  // Props
  export let variant: 'primary' | 'secondary' | 'outline' = 'primary';
  export let size: 'sm' | 'md' | 'lg' = 'md';
  export let href: string | undefined = undefined;
  export let disabled = false;
  export let type: 'button' | 'submit' | 'reset' = 'button';
  export let fullWidth = false;

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

  // 最終的なクラス名を構築（準拠）
  $: buttonClasses = ['btn', variantStyles[variant], sizeStyles[size], fullWidth ? 'btn-block' : '']
    .filter(Boolean)
    .join(' ');
</script>

{#if href}
  <a {href} class={buttonClasses} class:pointer-events-none={disabled} {...$$restProps}>
    <slot />
  </a>
{:else}
  <button {type} {disabled} class={buttonClasses} {...$$restProps} on:click>
    <slot />
  </button>
{/if}
