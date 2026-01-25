<script lang="ts">
  import {
    sample_url_preview_copy_url,
    sample_url_preview_title,
  } from '$lib/paraglide/messages.js';
  import { GoogleDocUrlTransformService } from '$lib/server/services/google-doc-url-transform-service.js';
  import { getDocumentTypeIcon, getDocumentTypeLabel } from '$lib/utils/document-type-util.js';

  interface Props {
    url: string;
  }

  let { url }: Props = $props();

  /**
   * URLを解析してプレビュー表示用のデータを取得
   * GoogleDocUrlTransformServiceを再利用してDRY原則を維持
   */
  let parsed = $derived.by(() => {
    if (!url) return null;
    try {
      const result = GoogleDocUrlTransformService.transform(url);
      return {
        type: result.documentType,
        id: result.documentId,
        copyUrl: result.copyUrl,
      };
    } catch {
      return null;
    }
  });
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
