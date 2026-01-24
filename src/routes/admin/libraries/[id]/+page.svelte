<script lang="ts">
  import { enhance } from '$app/forms';
  import Footer from '$lib/components/Footer.svelte';
  import LibraryDetail from '$lib/components/LibraryDetail.svelte';
  import { APP_CONFIG } from '$lib/constants/app-config.js';
  import type { LibraryStatus } from '$lib/constants/library-status.js';
  import * as m from '$lib/paraglide/messages.js';
  import type { ActionData, PageData } from './$types';

  // 管理者画面 - ライブラリ詳細ページ
  // ライブラリの詳細情報表示、スクレイピング実行、編集・公開機能

  interface Props {
    data: PageData;
    form?: ActionData;
  }

  let { data, form }: Props = $props();
  let library = $derived(data.library);

  let isScrapingInProgress = $state(false);
  let scrapingMessage = $state('');
  let isStatusUpdateInProgress = $state(false);
  let statusMessage = $state('');
  let isAiSummaryInProgress = $state(false);
  let aiSummaryMessage = $state('');

  // メッセージ管理のための状態
  let messageTimeoutId: ReturnType<typeof setTimeout> | null = null;

  // formの変更を監視するエフェクト（エフェクト内での状態更新を最小化）
  $effect(() => {
    if (form?.success || form?.error) {
      // 既存のタイムアウトをクリア
      if (messageTimeoutId) {
        clearTimeout(messageTimeoutId);
        messageTimeoutId = null;
      }

      if (form.success) {
        statusMessage = form.message || '';
        // 3秒後にメッセージを消去
        messageTimeoutId = setTimeout(() => {
          statusMessage = '';
        }, 3000);
      } else if (form.error) {
        statusMessage = form.error || '';
        // エラーメッセージは5秒後に消去
        messageTimeoutId = setTimeout(() => {
          statusMessage = '';
        }, 5000);
      }
    }
  });

  async function handleScraping() {
    if (isScrapingInProgress) return;

    isScrapingInProgress = true;
    scrapingMessage = 'GitHubリポジトリから情報を取得中...';

    try {
      // フォームアクションを使用してスクレイピングを実行
      const formData = new FormData();
      const response = await fetch(`?/runScraping`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        if (result.type === 'success' || result.success) {
          scrapingMessage =
            result.data?.message || result.message || 'スクレイピングが完了しました。';

          // AI要約生成の確認ダイアログ
          const shouldGenerateAiSummary = confirm(
            'スクレイピングが完了しました。\n\nAIによる要約を再生成しますか？\n\n※要約の生成には少し時間がかかります。'
          );

          if (shouldGenerateAiSummary) {
            // AI要約生成を実行
            handleAiSummaryGeneration();
          } else {
            // ページを再読み込み
            setTimeout(() => {
              window.location.reload();
            }, 1000);
          }
        } else {
          scrapingMessage = result.data?.error || result.error || 'スクレイピングに失敗しました。';
        }
      } else {
        try {
          const errorData = await response.json();
          scrapingMessage = errorData.error || 'スクレイピングに失敗しました。';
        } catch (parseError) {
          console.error('レスポンス解析エラー:', parseError);
          scrapingMessage = `スクレイピングに失敗しました。(HTTP ${response.status})`;
        }
      }
    } catch (error) {
      console.error('スクレイピングエラー:', error);
      console.error(
        'エラースタックトレース:',
        error instanceof Error ? error.stack : 'スタックトレース不明'
      );
      scrapingMessage = 'ネットワークエラーまたはサーバーエラーが発生しました。';
    } finally {
      isScrapingInProgress = false;
      // 3秒後にメッセージを消去（AI要約生成が実行されない場合）
      if (!isAiSummaryInProgress) {
        setTimeout(() => {
          scrapingMessage = '';
        }, 3000);
      }
    }
  }

  /**
   * AI要約生成を実行
   */
  async function handleAiSummaryGeneration() {
    if (isAiSummaryInProgress) return;

    isAiSummaryInProgress = true;
    aiSummaryMessage = 'AIによる要約を生成中です。しばらくお待ちください...';
    scrapingMessage = ''; // スクレイピングメッセージをクリア

    try {
      const formData = new FormData();
      const response = await fetch(`?/generateAiSummary`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        if (result.type === 'success') {
          aiSummaryMessage = result.data?.message || 'AI要約の生成が完了しました。';

          // ページを再読み込みして新しい要約を表示
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        } else {
          aiSummaryMessage = result.data?.error || 'AI要約の生成に失敗しました。';
        }
      } else {
        try {
          const errorData = await response.json();
          aiSummaryMessage = errorData.error || 'AI要約の生成に失敗しました。';
        } catch (parseError) {
          console.error('レスポンス解析エラー:', parseError);
          aiSummaryMessage = `AI要約の生成に失敗しました。(HTTP ${response.status})`;
        }
      }
    } catch (error) {
      console.error('AI要約生成エラー:', error);
      console.error(
        'エラースタックトレース:',
        error instanceof Error ? error.stack : 'スタックトレース不明'
      );
      aiSummaryMessage = 'ネットワークエラーまたはサーバーエラーが発生しました。';
    } finally {
      isAiSummaryInProgress = false;

      // AI要約生成が失敗した場合のみ、5秒後にメッセージを消去
      if (!aiSummaryMessage.includes('完了')) {
        setTimeout(() => {
          aiSummaryMessage = '';
        }, 5000);
      }
    }
  }

  /**
   * ステータス更新アクションのハンドラー
   */
  function handleStatusUpdate(newStatus: LibraryStatus) {
    isStatusUpdateInProgress = true;
    // フォームを送信
    const form = document.getElementById(`status-form-${newStatus}`) as HTMLFormElement;
    if (form) {
      form.requestSubmit();
    }
  }

  function handleEdit() {
    // 編集ページに遷移
    window.location.href = `/admin/libraries/${library.id}/edit`;
  }
</script>

<svelte:head>
  <title>{m.library_detail_title()} - {APP_CONFIG.SITE_NAME}</title>
  <meta
    name="description"
    content="{APP_CONFIG.SITE_NAME} admin - Library details and management"
  />
</svelte:head>

<main>
  <LibraryDetail
    {library}
    librarySummary={data.librarySummary}
    isAdminMode={true}
    form={form || undefined}
    onScraping={handleScraping}
    onEdit={handleEdit}
    onStatusUpdate={handleStatusUpdate}
    {isScrapingInProgress}
    {scrapingMessage}
    {isStatusUpdateInProgress}
    {statusMessage}
    {isAiSummaryInProgress}
    {aiSummaryMessage}
  />

  <!-- 隠しフォーム群（ステータス更新用） -->
  <form
    id="status-form-published"
    method="POST"
    action="?/updateStatus"
    use:enhance={() => {
      isStatusUpdateInProgress = true;
      return async ({ result, update }) => {
        // フォームの状態を更新
        await update();

        // ステータス更新の成功時のみライブラリステータスを楽観的に更新
        if (result.type === 'success' && result.data?.success) {
          library = { ...library, status: 'published' as LibraryStatus };
        }

        isStatusUpdateInProgress = false;
      };
    }}
    style="display: none;"
  >
    <input type="hidden" name="status" value="published" />
  </form>

  <form
    id="status-form-pending"
    method="POST"
    action="?/updateStatus"
    use:enhance={() => {
      isStatusUpdateInProgress = true;
      return async ({ result, update }) => {
        // フォームの状態を更新
        await update();

        // ステータス更新の成功時のみライブラリステータスを楽観的に更新
        if (result.type === 'success' && result.data?.success) {
          library = { ...library, status: 'pending' as LibraryStatus };
        }

        isStatusUpdateInProgress = false;
      };
    }}
    style="display: none;"
  >
    <input type="hidden" name="status" value="pending" />
  </form>

  <!-- Footer -->
  <Footer variant="admin" />
</main>
