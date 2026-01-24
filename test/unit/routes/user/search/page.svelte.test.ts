import { render, screen } from '@testing-library/svelte';
import { readable } from 'svelte/store';
import { describe, expect, it, vi } from 'vitest';

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
  };

  // 基本的なレンダリングテスト
  it('検索ページが正常にレンダリングされる', async () => {
    // $app/stores をモック
    vi.doMock('$app/stores', () => ({
      page: readable({
        url: {
          searchParams: {
            get: () => null,
          },
        },
      }),
    }));

    // 動的インポートでコンポーネントを読み込み
    const { default: SearchPage } =
      await import('../../../../../src/routes/user/search/+page.svelte');
    const { container } = render(SearchPage, { data: mockData });

    // 基本要素の確認（アクセシビリティ対応）
    const searchInput = screen.getByRole('searchbox');
    expect(searchInput).toBeTruthy();
    expect(container.querySelector('h1')).toBeTruthy();
    // 検索クエリがない場合は「All libraries」が表示される（多言語対応）
    expect(screen.getByText(/All libraries/)).toBeDefined();
  });

  // 検索フォームの存在確認
  it('検索フォームが表示される', async () => {
    vi.doMock('$app/stores', () => ({
      page: readable({
        url: {
          searchParams: {
            get: () => null,
          },
        },
      }),
    }));

    const { default: SearchPage } =
      await import('../../../../../src/routes/user/search/+page.svelte');
    const { container } = render(SearchPage, { data: mockData });

    // フォーム要素の確認（アクセシビリティ対応）
    const searchForm = container.querySelector('form');
    const searchInput = screen.getByRole('searchbox');

    expect(searchForm).toBeTruthy();
    expect(searchInput).toBeTruthy();
    expect(searchInput.getAttribute('placeholder')).toBe('Search GAS libraries');
    expect(searchInput.getAttribute('aria-label')).toBe('Search Apps Script libraries');
  });

  // コンポーネントの基本構造確認
  it('検索ページの基本構造が存在する', async () => {
    vi.doMock('$app/stores', () => ({
      page: readable({
        url: {
          searchParams: {
            get: () => null,
          },
        },
      }),
    }));

    const { default: SearchPage } =
      await import('../../../../../src/routes/user/search/+page.svelte');
    const { container } = render(SearchPage, { data: mockData });

    // コンテナとフォームの存在確認
    expect(container.querySelector('.container')).toBeTruthy();
    expect(container.querySelector('form')).toBeTruthy();
    expect(container.querySelector('h1')).toBeTruthy();

    // 検索アイコンの存在確認
    expect(container.querySelector('svg')).toBeTruthy();
  });
});
