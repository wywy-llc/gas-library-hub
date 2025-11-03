<script module lang="ts">
  import TagButton from '$lib/components/TagButton.svelte';
  import { defineMeta } from '@storybook/addon-svelte-csf';

  /**
   * TagButtonコンポーネントのStorybook設定
   * 様々なカラーバリエーションとサイズをサポートし、
   * クリック可能・非クリック可能の両方に対応した再利用可能なタグボタン
   */
  const { Story } = defineMeta({
    title: 'AppsScriptHub/TagButton',
    component: TagButton,
    tags: ['autodocs'],
    argTypes: {
      variant: {
        control: 'select',
        options: ['primary', 'secondary', 'success', 'warning', 'error', 'neutral', 'info'],
        description: 'カラーバリエーション',
      },
      size: {
        control: 'select',
        options: ['xs', 'sm', 'md'],
        description: 'サイズ',
      },
      disabled: {
        control: 'boolean',
        description: '無効化フラグ',
      },
      title: {
        control: 'text',
        description: 'ツールチップテキスト',
      },
      'aria-label': {
        control: 'text',
        description: 'aria-label（アクセシビリティ用）',
      },
    },
    parameters: {
      docs: {
        description: {
          component:
            '再利用可能なタグボタンコンポーネント。様々なカラーバリエーションとサイズをサポートし、クリック可能・非クリック可能の両方に対応。',
        },
      },
    },
  });

  function handleTagClick(tag: string) {
    alert(`タグ「${tag}」がクリックされました`);
  }
</script>

<!-- デフォルト -->
<Story name="Default">
  <div class="flex flex-wrap gap-2">
    <TagButton>デフォルト</TagButton>
  </div>
</Story>

<!-- カラーバリエーション -->
<Story name="Color Variants">
  <div class="flex flex-wrap gap-2">
    <TagButton variant="primary">Primary</TagButton>
    <TagButton variant="secondary">Secondary</TagButton>
    <TagButton variant="success">Success</TagButton>
    <TagButton variant="warning">Warning</TagButton>
    <TagButton variant="error">Error</TagButton>
    <TagButton variant="neutral">Neutral</TagButton>
    <TagButton variant="info">Info</TagButton>
  </div>
</Story>

<!-- サイズバリエーション -->
<Story name="Size Variants">
  <div class="flex flex-wrap items-center gap-2">
    <TagButton size="xs">Extra Small</TagButton>
    <TagButton size="sm">Small</TagButton>
    <TagButton size="md">Medium</TagButton>
  </div>
</Story>

<!-- クリック可能 -->
<Story name="Clickable">
  <div class="flex flex-wrap gap-2">
    <TagButton onclick={() => handleTagClick('JavaScript')} title="「JavaScript」で検索">
      JavaScript
    </TagButton>
    <TagButton
      variant="success"
      onclick={() => handleTagClick('TypeScript')}
      title="「TypeScript」で検索"
    >
      TypeScript
    </TagButton>
    <TagButton variant="warning" onclick={() => handleTagClick('React')} title="「React」で検索">
      React
    </TagButton>
  </div>
</Story>

<!-- 無効化 -->
<Story name="Disabled">
  <div class="flex flex-wrap gap-2">
    <TagButton disabled>無効化タグ</TagButton>
    <TagButton variant="success" disabled onclick={() => handleTagClick('無効')}>
      クリック無効化
    </TagButton>
  </div>
</Story>

<!-- 実際の使用例（LibraryCardスタイル） -->
<Story name="Library Card Style">
  <div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
    <h3 class="mb-4 text-lg font-semibold">ライブラリタグ例</h3>
    <div class="flex flex-wrap gap-2">
      <TagButton onclick={() => handleTagClick('GAS')} title="「GAS」で検索">GAS</TagButton>
      <TagButton
        variant="success"
        onclick={() => handleTagClick('Utility')}
        title="「Utility」で検索"
      >
        Utility
      </TagButton>
      <TagButton variant="secondary" onclick={() => handleTagClick('Date')} title="「Date」で検索">
        Date
      </TagButton>
      <TagButton
        variant="warning"
        onclick={() => handleTagClick('Format')}
        title="「Format」で検索"
      >
        Format
      </TagButton>
    </div>
  </div>
</Story>

<!-- アクセシビリティ -->
<Story name="Accessibility">
  <div class="flex flex-wrap gap-2">
    <TagButton
      onclick={() => handleTagClick('アクセシブル')}
      title="アクセシブルなタグ"
      aria-label="アクセシブルなタグ、クリックで検索"
    >
      アクセシブル
    </TagButton>
    <TagButton variant="success" aria-label="読み取り専用タグ">読み取り専用</TagButton>
  </div>
</Story>

<!-- カスタムクラス -->
<Story name="Custom Class">
  <div class="flex flex-wrap gap-2">
    <TagButton class="shadow-lg ring-2 ring-blue-300">カスタムスタイル</TagButton>
    <TagButton variant="error" class="tracking-wider uppercase">大文字</TagButton>
  </div>
</Story>
