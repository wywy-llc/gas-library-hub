<script module>
  import Toast from '$lib/components/Toast.svelte';
  import { TOAST_TYPE } from '$lib/constants/toast.js';
  import { defineMeta } from '@storybook/addon-svelte-csf';

  // トーストコンポーネントのStorybook設定
  // 成功、エラー、警告、情報の4種類のトーストメッセージをサポート
  const { Story } = defineMeta({
    title: 'AppsScriptHub/Toast',
    component: Toast,
    tags: ['autodocs'],
    argTypes: {
      toast: {
        description: 'トーストメッセージオブジェクト',
        control: 'object',
      },
    },
    parameters: {
      docs: {
        description: {
          component:
            '個別のトーストメッセージコンポーネント。フェードイン・フェードアウトアニメーション付き。',
        },
      },
    },
  });

  // サンプルトーストデータ生成関数
  /**
   * @param {string} type
   * @param {string} message
   * @param {string} id
   */
  function createMockToast(type, message, id = 'sample-toast') {
    return /** @type {import('$lib/stores/toast-store.js').ToastMessage} */ ({
      id,
      message,
      type,
      duration: 3000,
    });
  }
</script>

<!-- Success Toast -->
<Story name="Success" args={{ toast: createMockToast(TOAST_TYPE.SUCCESS, 'コピーしました') }}>
  <Toast toast={createMockToast(TOAST_TYPE.SUCCESS, 'コピーしました')} />
</Story>

<!-- Error Toast -->
<Story name="Error" args={{ toast: createMockToast(TOAST_TYPE.ERROR, 'エラーが発生しました') }}>
  <Toast toast={createMockToast(TOAST_TYPE.ERROR, 'エラーが発生しました')} />
</Story>

<!-- Warning Toast -->
<Story name="Warning" args={{ toast: createMockToast(TOAST_TYPE.WARNING, '注意が必要です') }}>
  <Toast toast={createMockToast(TOAST_TYPE.WARNING, '注意が必要です')} />
</Story>

<!-- Info Toast -->
<Story name="Info" args={{ toast: createMockToast(TOAST_TYPE.INFO, '処理を開始しました') }}>
  <Toast toast={createMockToast(TOAST_TYPE.INFO, '処理を開始しました')} />
</Story>

<!-- Long Message -->
<Story
  name="Long Message"
  args={{
    toast: createMockToast(
      TOAST_TYPE.SUCCESS,
      'これは非常に長いメッセージの例です。複数行に渡ってテキストが表示される場合の動作を確認できます。'
    ),
  }}
>
  <Toast
    toast={createMockToast(
      TOAST_TYPE.SUCCESS,
      'これは非常に長いメッセージの例です。複数行に渡ってテキストが表示される場合の動作を確認できます。'
    )}
  />
</Story>

<!-- All Types Showcase -->
<Story
  name="All Types"
  tags={['no-vitest']}
  args={{
    toasts: [
      createMockToast(TOAST_TYPE.SUCCESS, '操作が正常に完了しました', 'success-toast'),
      createMockToast(TOAST_TYPE.ERROR, 'エラーが発生しました', 'error-toast'),
      createMockToast(TOAST_TYPE.WARNING, '注意: この操作は元に戻せません', 'warning-toast'),
      createMockToast(TOAST_TYPE.INFO, '新しい機能が利用可能です', 'info-toast'),
    ],
  }}
>
  <div class="space-y-3">
    <Toast
      toast={createMockToast(TOAST_TYPE.SUCCESS, '操作が正常に完了しました', 'success-toast')}
    />
    <Toast toast={createMockToast(TOAST_TYPE.ERROR, 'エラーが発生しました', 'error-toast')} />
    <Toast
      toast={createMockToast(TOAST_TYPE.WARNING, '注意: この操作は元に戻せません', 'warning-toast')}
    />
    <Toast toast={createMockToast(TOAST_TYPE.INFO, '新しい機能が利用可能です', 'info-toast')} />
  </div>
</Story>

<!-- Copy Button Example -->
<Story
  name="Copy Button Example"
  tags={['no-vitest']}
  args={{ toast: createMockToast(TOAST_TYPE.SUCCESS, 'コピーしました') }}
>
  <div class="space-y-4">
    <p class="text-sm text-gray-600">
      以下のボタンをクリックするとトーストが表示されます（実際のアプリでの使用例）
    </p>
    <button
      class="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
      onclick={() => {
        // 実際のアプリではtoastStore.success()を使用
        console.log('トーストが表示されました');
      }}
    >
      スクリプトIDをコピー
    </button>
    <Toast toast={createMockToast(TOAST_TYPE.SUCCESS, 'コピーしました')} />
  </div>
</Story>
