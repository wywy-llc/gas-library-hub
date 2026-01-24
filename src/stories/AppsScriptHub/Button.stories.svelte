<script module>
  import Button from '$lib/components/Button.svelte';
  import { defineMeta } from '@storybook/addon-svelte-csf';

  // 再利用可能なボタンコンポーネントのStorybook設定
  // プライマリ、セカンダリ、アウトラインバリアントをサポート
  const { Story } = defineMeta({
    title: 'AppsScriptHub/Button',
    component: Button,
    tags: ['autodocs'],
    argTypes: {
      variant: {
        control: 'select',
        options: ['primary', 'secondary', 'outline'],
        description: 'ボタンのスタイルバリアント',
      },
      size: {
        control: 'select',
        options: ['sm', 'md', 'lg'],
        description: 'ボタンのサイズ',
      },
      disabled: {
        control: 'boolean',
        description: 'ボタンを無効化',
      },
      fullWidth: {
        control: 'boolean',
        description: '全幅表示にする',
      },
      href: {
        control: 'text',
        description: 'リンクURL（設定時はaタグとして描画）',
      },
    },
    parameters: {
      docs: {
        description: {
          component:
            '再利用可能なボタンコンポーネント。プライマリ、セカンダリ、アウトラインバリアントをサポート。',
        },
      },
    },
  });
</script>

<!-- Primary Button -->
<Story name="Primary" args={{ variant: 'primary', size: 'md' }}>
  <Button variant="primary" size="md">Primary Button</Button>
</Story>

<!-- Secondary Button -->
<Story name="Secondary" args={{ variant: 'secondary', size: 'md' }}>
  <Button variant="secondary" size="md">Secondary Button</Button>
</Story>

<!-- Outline Button -->
<Story name="Outline" args={{ variant: 'outline', size: 'md' }}>
  <Button variant="outline" size="md">Outline Button</Button>
</Story>

<!-- Sizes Showcase -->
<Story name="Sizes">
  <div class="space-y-4">
    <Button variant="primary" size="sm">Small Button</Button>
    <Button variant="primary" size="md">Medium Button</Button>
    <Button variant="primary" size="lg">Large Button</Button>
  </div>
</Story>

<!-- All Variants -->
<Story name="All Variants">
  <div class="space-x-4">
    <Button variant="primary" size="md">Primary</Button>
    <Button variant="secondary" size="md">Secondary</Button>
    <Button variant="outline" size="md">Outline</Button>
  </div>
</Story>

<!-- Disabled State -->
<Story name="Disabled">
  <div class="space-x-4">
    <Button variant="primary" size="md" disabled>Primary Disabled</Button>
    <Button variant="secondary" size="md" disabled>Secondary Disabled</Button>
    <Button variant="outline" size="md" disabled>Outline Disabled</Button>
  </div>
</Story>

<!-- Full Width -->
<Story name="Full Width">
  <Button variant="primary" size="md" fullWidth>Full Width Button</Button>
</Story>

<!-- As Link -->
<Story name="As Link">
  <Button variant="primary" size="md" href="#">Link Button</Button>
</Story>

<!-- Interactive Example -->
<Story name="Interactive">
  <Button variant="primary" size="md" onclick={() => alert('Button clicked!')}>Click Me!</Button>
</Story>
