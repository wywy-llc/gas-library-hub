<script lang="ts">
  import type { HreflangLink } from '$lib/utils/seo.js';

  interface Props {
    title: string;
    description: string;
    keywords?: string;
    canonical: string;
    author?: string;
    // Open Graph
    ogType?: 'website' | 'article';
    ogUrl: string;
    ogImage: string;
    ogSiteName: string;
    ogAuthor?: string;
    ogSection?: string;
    ogTags?: string[];
    // Twitter Card
    twitterCard?: 'summary' | 'summary_large_image';
    twitterCreator?: string;
    // hreflang
    hreflangLinks?: HreflangLink[];
  }

  let {
    title,
    description,
    keywords,
    canonical,
    author,
    ogType = 'website',
    ogUrl,
    ogImage,
    ogSiteName,
    ogAuthor,
    ogSection,
    ogTags,
    twitterCard = 'summary_large_image',
    twitterCreator,
    hreflangLinks,
  }: Props = $props();
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="description" content={description} />
  {#if keywords}<meta name="keywords" content={keywords} />{/if}
  {#if author}<meta name="author" content={author} />{/if}

  <!-- Open Graph -->
  <meta property="og:type" content={ogType} />
  <meta property="og:url" content={ogUrl} />
  <meta property="og:title" content={title} />
  <meta property="og:description" content={description} />
  <meta property="og:image" content={ogImage} />
  <meta property="og:site_name" content={ogSiteName} />
  {#if ogAuthor}<meta property="article:author" content={ogAuthor} />{/if}
  {#if ogSection}<meta property="article:section" content={ogSection} />{/if}
  {#if ogTags}{#each ogTags as tag (tag)}<meta property="article:tag" content={tag} />{/each}{/if}

  <!-- Twitter Card -->
  <meta name="twitter:card" content={twitterCard} />
  <meta name="twitter:url" content={ogUrl} />
  <meta name="twitter:title" content={title} />
  <meta name="twitter:description" content={description} />
  <meta name="twitter:image" content={ogImage} />
  {#if twitterCreator}<meta name="twitter:creator" content={twitterCreator} />{/if}

  <!-- Canonical & Hreflang -->
  <link rel="canonical" href={canonical} />
  {#if hreflangLinks}
    {#each hreflangLinks as link (link.hreflang)}
      <link rel="alternate" hreflang={link.hreflang} href={link.href} />
    {/each}
  {/if}
</svelte:head>
