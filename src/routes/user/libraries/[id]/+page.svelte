<script lang="ts">
  import LibraryDetail from '$lib/components/LibraryDetail.svelte';
  import SeoHead from '$lib/components/SeoHead.svelte';
  import { APP_CONFIG, createAppUrl } from '$lib/constants/app-config.js';
  import {
    breadcrumb_home,
    breadcrumb_libraries,
    copy_count_update_failed,
  } from '$lib/paraglide/messages.js';
  import { getLocale } from '$lib/paraglide/runtime.js';
  import {
    addJsonLdToHead,
    generateBreadcrumbJsonLd,
    generateHreflangLinks,
    generateJsonLd,
    generateKeywords,
    generateSeoDescription,
    generateSeoTitle,
    removeJsonLdFromHead,
  } from '$lib/utils/seo.js';
  import { onMount } from 'svelte';
  import type { PageData } from './$types.js';

  // ライブラリ詳細ページコンポーネント
  // 特定のGASライブラリの詳細情報、README、メソッド一覧を表示

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();
  const library = $derived(data.library);
  const librarySummary = $derived(data.librarySummary);

  // 現在のロケールを取得
  const currentLocale = getLocale();

  // SEO関連のデータをメモ化（$derivedでパフォーマンス最適化）
  const seoTitle = $derived(generateSeoTitle(library, librarySummary, currentLocale));
  const seoDescription = $derived(generateSeoDescription(library, librarySummary, currentLocale));
  const seoKeywords = $derived(generateKeywords(librarySummary, currentLocale));
  const jsonLd = $derived(generateJsonLd(library, librarySummary, currentLocale));

  // ページパスとURL
  const pagePath = $derived(`/user/libraries/${library.id}`);
  const pageUrl = $derived(createAppUrl(pagePath));
  const ogpImageUrl = $derived(createAppUrl(`${pagePath}/ogp-image`));
  const hreflangLinks = $derived(generateHreflangLinks(pagePath));

  // BreadcrumbList JSON-LD
  const breadcrumbItems = $derived([
    { name: breadcrumb_home(), url: createAppUrl('/user') },
    { name: breadcrumb_libraries(), url: createAppUrl('/user/search') },
    { name: library.name, url: pageUrl },
  ]);
  const breadcrumbJsonLd = $derived(generateBreadcrumbJsonLd(breadcrumbItems));

  // コンポーネントマウント時にJSON-LDを動的に追加（$derivedメモ化済みのjsonLdを使用）
  onMount(() => {
    // SoftwareSourceCode JSON-LDを追加
    addJsonLdToHead(jsonLd);

    // BreadcrumbList JSON-LDを追加
    const breadcrumbScript = document.createElement('script');
    breadcrumbScript.type = 'application/ld+json';
    breadcrumbScript.id = 'breadcrumb-jsonld';
    breadcrumbScript.textContent = JSON.stringify(breadcrumbJsonLd);
    document.head.appendChild(breadcrumbScript);

    // クリーンアップ関数を返す
    return () => {
      removeJsonLdFromHead();
      const breadcrumbScriptToRemove = document.getElementById('breadcrumb-jsonld');
      if (breadcrumbScriptToRemove) {
        breadcrumbScriptToRemove.remove();
      }
    };
  });

  // データベースのコピー回数を表示用の状態として管理
  let displayCopyCount = $state(0);

  // library.copyCountが変更された時に同期
  $effect(() => {
    displayCopyCount = library.copyCount;
  });

  // localStorageのキー（重複カウント防止用）
  const COPIED_SCRIPTS_KEY = 'copied-script-ids';

  // サーバーサイドでコピー回数を増加
  async function incrementCopyCount() {
    try {
      const response = await fetch(`/user/libraries/${library.id}/copy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        displayCopyCount = data.copyCount;
        markAsCopied();
      }
    } catch (err) {
      console.error(copy_count_update_failed(), err);
    }
  }

  // このスクリプトIDが既にコピーされているかチェック
  function hasBeenCopiedBefore(): boolean {
    if (typeof window === 'undefined') return false;

    const copiedScripts = localStorage.getItem(COPIED_SCRIPTS_KEY);
    if (!copiedScripts) return false;

    try {
      const copiedScriptIds: string[] = JSON.parse(copiedScripts);
      return copiedScriptIds.includes(library.scriptId);
    } catch {
      return false;
    }
  }

  // コピー済みスクリプトIDとしてマーク
  function markAsCopied() {
    if (typeof window === 'undefined') return;

    const copiedScripts = localStorage.getItem(COPIED_SCRIPTS_KEY);
    let copiedScriptIds: string[] = [];

    if (copiedScripts) {
      try {
        copiedScriptIds = JSON.parse(copiedScripts);
      } catch {
        copiedScriptIds = [];
      }
    }

    if (!copiedScriptIds.includes(library.scriptId)) {
      copiedScriptIds.push(library.scriptId);
      localStorage.setItem(COPIED_SCRIPTS_KEY, JSON.stringify(copiedScriptIds));
    }
  }

  // スクリプトIDコピー用のコールバック
  async function handleCopyScriptId() {
    const alreadyCopied = hasBeenCopiedBefore();

    if (!alreadyCopied) {
      // 初回コピー時のみサーバーサイドでカウントを増加
      await incrementCopyCount();
    }
  }
</script>

<SeoHead
  title={seoTitle}
  description={seoDescription}
  keywords={seoKeywords}
  canonical={pageUrl}
  author={library.authorName}
  ogType="article"
  ogUrl={pageUrl}
  ogImage={ogpImageUrl}
  ogSiteName={APP_CONFIG.SITE_NAME}
  ogAuthor={library.authorName}
  ogSection="Google Apps Script"
  ogTags={['Google Apps Script', 'GAS', 'ライブラリ']}
  twitterCreator={`@${library.authorName}`}
  {hreflangLinks}
/>

<main>
  <article>
    <LibraryDetail
      {library}
      librarySummary={data.librarySummary}
      isAdminMode={false}
      {displayCopyCount}
      onCopyScriptId={handleCopyScriptId}
    />
  </article>
</main>
