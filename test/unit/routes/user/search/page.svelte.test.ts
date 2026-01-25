import { render } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';

// $app/stores のモック
vi.mock('$app/stores', () => ({
  page: {
    subscribe: (fn: (value: unknown) => void) => {
      fn({
        url: {
          searchParams: new URLSearchParams(),
        },
      });
      return () => {};
    },
  },
}));

// 検索結果ページの最低限のテスト
describe('SearchPage', () => {
  const mockData = {
    user: null,
    session: null,
    libraries: [],
    totalResults: 0,
    searchQuery: '',
    currentPage: 1,
    itemsPerPage: 10,
    scriptType: 'library' as const,
    orderBy: 'starCount' as const,
  };

  // 基本的なレンダリングテスト
  it('検索ページが正常にレンダリングされる', async () => {
    const { default: SearchPage } =
      await import('../../../../../src/routes/user/search/+page.svelte');
    const { container } = render(SearchPage, { props: { data: mockData } });

    // 基本要素の確認
    expect(container.querySelector('h1')).toBeTruthy();
    expect(container.querySelector('main')).toBeTruthy();
  });

  // 検索クエリがある場合のテスト
  it('検索クエリがある場合、結果タイトルが表示される', async () => {
    const dataWithQuery = {
      ...mockData,
      searchQuery: 'test',
      totalResults: 5,
    };

    const { default: SearchPage } =
      await import('../../../../../src/routes/user/search/+page.svelte');
    const { container } = render(SearchPage, { props: { data: dataWithQuery } });

    const h1 = container.querySelector('h1');
    expect(h1?.textContent).toContain('test');
  });

  // コンポーネントの基本構造確認
  it('検索ページの基本構造が存在する', async () => {
    const { default: SearchPage } =
      await import('../../../../../src/routes/user/search/+page.svelte');
    const { container } = render(SearchPage, { props: { data: mockData } });

    // コンテナとフォームの存在確認
    expect(container.querySelector('.container')).toBeTruthy();
    expect(container.querySelector('h1')).toBeTruthy();
    expect(container.querySelector('main')).toBeTruthy();
  });
});
