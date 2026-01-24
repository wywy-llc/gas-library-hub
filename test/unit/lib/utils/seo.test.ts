import { describe, expect, test, vi } from 'vitest';
import { generateHreflangLinks, generateBreadcrumbJsonLd } from '../../../../src/lib/utils/seo.js';

// app-configのモック
vi.mock('$lib/constants/app-config.js', () => ({
  createAppUrl: (path: string) => `https://appscripthub.com${path}`,
  APP_CONFIG: {
    SITE_NAME: 'GAS Library Hub',
    DOMAIN: 'appscripthub.com',
    BASE_URL: 'https://appscripthub.com',
    LOGO_PATH: '/logo.png',
  },
}));

// localeのモック
vi.mock('$lib/types/locale.js', () => ({
  SUPPORTED_LOCALES: ['en', 'ja'] as const,
  DEFAULT_LOCALE: 'en' as const,
}));

describe('seo', () => {
  describe('generateHreflangLinks', () => {
    test('en, ja, x-defaultの3つのリンクを生成する', () => {
      const result = generateHreflangLinks('/user');

      expect(result).toHaveLength(3);
      expect(result.map(link => link.hreflang)).toEqual(['en', 'ja', 'x-default']);
    });

    test('enロケールのパスにプレフィックスを付けない', () => {
      const result = generateHreflangLinks('/user/search');

      const enLink = result.find(link => link.hreflang === 'en');
      expect(enLink?.href).toBe('https://appscripthub.com/user/search');
    });

    test('jaロケールのパスに/jaプレフィックスを付ける', () => {
      const result = generateHreflangLinks('/user/search');

      const jaLink = result.find(link => link.hreflang === 'ja');
      expect(jaLink?.href).toBe('https://appscripthub.com/ja/user/search');
    });

    test('x-defaultはenロケールと同じURLになる', () => {
      const result = generateHreflangLinks('/user/libraries/123');

      const enLink = result.find(link => link.hreflang === 'en');
      const xDefaultLink = result.find(link => link.hreflang === 'x-default');
      expect(xDefaultLink?.href).toBe(enLink?.href);
    });

    test('/ja始まりのパスからプレフィックスを除去してベースパスを取得する', () => {
      const result = generateHreflangLinks('/ja/user/search');

      const enLink = result.find(link => link.hreflang === 'en');
      const jaLink = result.find(link => link.hreflang === 'ja');

      expect(enLink?.href).toBe('https://appscripthub.com/user/search');
      expect(jaLink?.href).toBe('https://appscripthub.com/ja/user/search');
    });

    test('ルートパスの場合でも正しく処理する', () => {
      const result = generateHreflangLinks('/');

      const enLink = result.find(link => link.hreflang === 'en');
      const jaLink = result.find(link => link.hreflang === 'ja');

      expect(enLink?.href).toBe('https://appscripthub.com/');
      expect(jaLink?.href).toBe('https://appscripthub.com/ja/');
    });
  });

  describe('generateBreadcrumbJsonLd', () => {
    test('正しいBreadcrumbList JSON-LDを生成する', () => {
      const items = [
        { name: 'Home', url: 'https://appscripthub.com/user' },
        { name: 'Search', url: 'https://appscripthub.com/user/search' },
      ];

      const result = generateBreadcrumbJsonLd(items);

      expect(result).toEqual({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: 'https://appscripthub.com/user',
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Search',
            item: 'https://appscripthub.com/user/search',
          },
        ],
      });
    });

    test('positionを1から順に設定する', () => {
      const items = [
        { name: 'A', url: 'https://example.com/a' },
        { name: 'B', url: 'https://example.com/b' },
        { name: 'C', url: 'https://example.com/c' },
      ];

      const result = generateBreadcrumbJsonLd(items) as {
        itemListElement: Array<{ position: number }>;
      };

      expect(result.itemListElement[0].position).toBe(1);
      expect(result.itemListElement[1].position).toBe(2);
      expect(result.itemListElement[2].position).toBe(3);
    });

    test('空の配列の場合は空のitemListElementを返す', () => {
      const result = generateBreadcrumbJsonLd([]);

      expect(result).toEqual({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [],
      });
    });

    test('単一アイテムの場合も正しく処理する', () => {
      const items = [{ name: 'Home', url: 'https://appscripthub.com/' }];

      const result = generateBreadcrumbJsonLd(items) as {
        itemListElement: Array<{ position: number; name: string }>;
      };

      expect(result.itemListElement).toHaveLength(1);
      expect(result.itemListElement[0].position).toBe(1);
      expect(result.itemListElement[0].name).toBe('Home');
    });
  });
});
