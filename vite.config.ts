import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { svelteTesting } from '@testing-library/svelte/vite';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [tailwindcss(), sveltekit()],
    define: {
      'process.env.DATABASE_URL': JSON.stringify(env.DATABASE_URL),
      'process.env.NODE_ENV': JSON.stringify(env.NODE_ENV),
      'process.env.POSTGRES_USER': JSON.stringify(env.POSTGRES_USER),
      'process.env.POSTGRES_PASSWORD': JSON.stringify(env.POSTGRES_PASSWORD),
      'process.env.POSTGRES_DB': JSON.stringify(env.POSTGRES_DB),
    },
    test: {
      projects: [
        {
          extends: './vite.config.ts',
          plugins: [svelteTesting()],
          test: {
            name: 'client',
            environment: 'jsdom',
            clearMocks: true,
            include: ['test/unit/**/*.svelte.{test,spec}.{js,ts}'],
            setupFiles: ['./vitest-setup-client.ts'],
          },
        },
        {
          extends: './vite.config.ts',
          test: {
            name: 'server',
            environment: 'node',
            include: ['test/**/*.{test,spec}.{js,ts}'],
            exclude: ['test/**/*.svelte.{test,spec}.{js,ts}', 'test/e2e/**'],
            setupFiles: ['./vitest-setup-server.ts'],
          },
        },
        './vitest.config.storybook.ts',
      ],
    },
  };
});
