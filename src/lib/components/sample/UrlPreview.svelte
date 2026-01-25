<script lang="ts">
  import {
    sample_url_preview_title,
    sample_url_preview_copy_url,
    sample_document_type_spreadsheet,
    sample_document_type_document,
    sample_document_type_slides,
    sample_document_type_apps_script,
  } from '$lib/paraglide/messages.js';
  import type { DocumentType } from '$lib/server/db/schema.js';

  interface Props {
    url: string;
  }

  let { url }: Props = $props();

  // ドキュメントタイプ検出パターン
  const PATTERNS = {
    spreadsheet: /docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/,
    document: /docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/,
    slides: /docs\.google\.com\/presentation\/d\/([a-zA-Z0-9_-]+)/,
    apps_script: /script\.google\.com\/(?:home\/projects\/|d\/)([a-zA-Z0-9_-]+)/,
  } as const;

  function parseUrl(inputUrl: string): { type: DocumentType; id: string; copyUrl: string } | null {
    for (const [type, pattern] of Object.entries(PATTERNS)) {
      const match = inputUrl.match(pattern);
      if (match) {
        const docType = type as DocumentType;
        const id = match[1];
        let copyUrl: string;
        switch (docType) {
          case 'spreadsheet':
            copyUrl = `https://docs.google.com/spreadsheets/d/${id}/copy`;
            break;
          case 'document':
            copyUrl = `https://docs.google.com/document/d/${id}/copy`;
            break;
          case 'slides':
            copyUrl = `https://docs.google.com/presentation/d/${id}/copy`;
            break;
          case 'apps_script':
            copyUrl = `https://script.google.com/d/${id}/edit?copyDoc=true`;
            break;
        }
        return { type: docType, id, copyUrl };
      }
    }
    return null;
  }

  function getDocumentTypeLabel(type: DocumentType): string {
    switch (type) {
      case 'spreadsheet':
        return sample_document_type_spreadsheet();
      case 'document':
        return sample_document_type_document();
      case 'slides':
        return sample_document_type_slides();
      case 'apps_script':
        return sample_document_type_apps_script();
    }
  }

  function getDocumentTypeIcon(type: DocumentType): string {
    switch (type) {
      case 'spreadsheet':
        return '📊';
      case 'document':
        return '📄';
      case 'slides':
        return '📽️';
      case 'apps_script':
        return '⚡';
    }
  }

  let parsed = $derived(parseUrl(url));
</script>

{#if parsed}
  <div class="bg-base-200 mt-2 rounded-lg p-4">
    <div class="mb-2 text-sm font-medium">{sample_url_preview_title()}</div>
    <div class="mb-2 flex items-center gap-2">
      <span class="text-xl">{getDocumentTypeIcon(parsed.type)}</span>
      <span class="badge badge-outline">{getDocumentTypeLabel(parsed.type)}</span>
    </div>
    <div class="text-sm">
      <span class="text-base-content/60">{sample_url_preview_copy_url()}:</span>
      <a
        href={parsed.copyUrl}
        target="_blank"
        rel="noopener noreferrer"
        class="link link-primary break-all"
      >
        {parsed.copyUrl}
      </a>
    </div>
  </div>
{:else if url && (url.includes('docs.google.com') || url.includes('script.google.com'))}
  <div class="bg-warning/10 mt-2 rounded-lg p-4">
    <div class="text-warning text-sm">
      URLの形式を確認してください。スプレッドシート、ドキュメント、スライド、Apps
      ScriptのURLを入力してください。
    </div>
  </div>
{/if}
