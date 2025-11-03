<script lang="ts">
  /**
   * 再利用可能なタグボタンコンポーネント - daisyUI v5準拠
   * 様々なカラーバリエーションとサイズをサポートし、
   * クリック可能・非クリック可能の両方に対応
   *
   * 使用例:
   * <TagButton>デフォルト</TagButton>
   * <TagButton variant="success" size="md" onclick={handleClick}>クリック可能</TagButton>
   * <TagButton variant="gray" disabled>無効化</TagButton>
   */

  type Variant = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'neutral' | 'info';
  type Size = 'xs' | 'sm' | 'md';

  interface Props {
    /** タグのテキスト */
    children: import('svelte').Snippet;
    /** カラーバリエーション */
    variant?: Variant;
    /** サイズ */
    size?: Size;
    /** クリックハンドラー（指定時はクリック可能になる） */
    onclick?: () => void;
    /** 無効化フラグ */
    disabled?: boolean;
    /** 追加CSSクラス */
    class?: string;
    /** ツールチップテキスト */
    title?: string;
    /** aria-label（アクセシビリティ用） */
    'aria-label'?: string;
  }

  let {
    children,
    variant = 'primary',
    size = 'xs',
    disabled = false,
    onclick,
    class: className = '',
    title,
    'aria-label': ariaLabel,
  }: Props = $props();

  // daisyUI v5カラーバリエーション定義
  const variants = {
    primary: 'badge-primary',
    secondary: 'badge-secondary',
    success: 'badge-success',
    warning: 'badge-warning',
    error: 'badge-error',
    neutral: 'badge-neutral',
    info: 'badge-info',
  };

  // daisyUI v5サイズ定義
  const sizes = {
    xs: 'badge-xs',
    sm: 'badge-sm',
    md: 'badge-md',
  };

  // 動的クラス生成（daisyUI v5準拠）
  const baseClasses = 'badge';
  const variantClasses = variants[variant];
  const sizeClasses = sizes[size];
  const interactiveClasses = onclick && !disabled ? 'cursor-pointer' : '';

  const combinedClasses = [baseClasses, variantClasses, sizeClasses, interactiveClasses, className]
    .filter(Boolean)
    .join(' ');

  // クリックハンドラー
  function handleClick() {
    if (!disabled && onclick) {
      onclick();
    }
  }
</script>

{#if onclick}
  <!-- クリック可能なボタンとして描画 -->
  <button
    type="button"
    class={combinedClasses}
    {title}
    aria-label={ariaLabel}
    {disabled}
    onclick={handleClick}
  >
    {@render children()}
  </button>
{:else}
  <!-- 読み取り専用のスパンとして描画 -->
  <span class={combinedClasses} {title} aria-label={ariaLabel}>
    {@render children()}
  </span>
{/if}
