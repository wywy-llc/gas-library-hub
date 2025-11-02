import type { StorybookConfig } from '@storybook/sveltekit';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(js|ts|svelte)'],
  addons: [
    '@storybook/addon-docs',
    '@storybook/addon-a11y',
    '@storybook/addon-vitest',
    '@storybook/addon-svelte-csf',
  ],
  framework: {
    name: '@storybook/sveltekit',
    options: {},
  },
  core: {
    disableWhatsNewNotifications: true,
  },
  docs: {
    defaultName: 'Docs',
  },
  viteFinal: async config => {
    // Tailwind CSSの設定を確実に読み込む
    // 環境変数モジュールのモック設定
    if (!config.resolve) {
      config.resolve = {};
    }
    if (!config.resolve.alias) {
      config.resolve.alias = {};
    }

    // $env/dynamic/publicモジュールをモック
    const alias = config.resolve.alias as Record<string, string>;
    alias['$env/dynamic/public'] = new URL('./mocks/env.ts', import.meta.url).pathname;

    return config;
  },
};

export default config;
