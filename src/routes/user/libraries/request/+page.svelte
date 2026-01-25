<script lang="ts">
  import { enhance } from '$app/forms';
  import { goto } from '$app/navigation';
  import { APP_CONFIG } from '$lib/constants/app-config.js';
  import {
    add_request_about,
    add_request_conditions,
    add_request_conditions_description,
    add_request_conditions_docs,
    add_request_conditions_github,
    add_request_conditions_value,
    add_request_flow,
    add_request_flow_description,
    add_request_review,
    add_request_review_description,
    cancel,
    gas_library_add,
    gas_library_add_description,
    gas_library_add_page_title,
    gas_library_add_success,
    gas_script_id_help,
    gas_script_id_label,
    gas_script_id_placeholder,
    github_repository_url_help,
    github_repository_url_label,
    github_repository_url_placeholder,
    submit_request,
    submitting_request,
  } from '$lib/paraglide/messages.js';
  import type { ActionData } from './$types';

  // ユーザー画面 - GASライブラリ追加ページ
  // 登録ユーザーがGASライブラリの新規追加を管理者に申請

  interface Props {
    form?: ActionData;
  }

  let { form = $bindable() }: Props = $props();

  // フォーム送信状態
  let isSubmitting = $state(false);
  let submitMessage = $state('');

  // フォーム送信時の処理
  $effect(() => {
    if (form?.success) {
      submitMessage = gas_library_add_success();
      // 成功時は一定時間後にユーザートップページに遷移
      setTimeout(() => {
        goto('/user');
      }, 3000);
    } else if (form?.error) {
      submitMessage = form.error;
    }
  });

  function handleCancel() {
    // ユーザートップページに戻る
    goto('/user');
  }
</script>

<svelte:head>
  <title>{gas_library_add()} - {APP_CONFIG.SITE_NAME}</title>
  <meta name="description" content="{APP_CONFIG.SITE_NAME} - {gas_library_add()}" />
</svelte:head>

<div class="bg-base-200 min-h-screen">
  <main class="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
    <div class="mx-auto max-w-3xl">
      <!-- ページヘッダー -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold">{gas_library_add_page_title()}</h1>
        <p class="mt-2 text-sm opacity-70">
          {gas_library_add_description()}
        </p>
      </div>

      <!-- 送信メッセージ -->
      {#if submitMessage}
        <div class="alert mb-6 {form?.success ? 'alert-success' : 'alert-error'}" role="alert">
          <span>{submitMessage}</span>
        </div>
      {/if}

      <!-- Library Request Form -->
      <form
        method="POST"
        action="?/submitRequest"
        class="space-y-8"
        use:enhance={() => {
          isSubmitting = true;
          submitMessage = '';

          return async ({ result, update }) => {
            isSubmitting = false;

            if (result.type === 'failure') {
              submitMessage =
                (result.data as { message?: string })?.message || 'エラーが発生しました。';
            } else if (result.type === 'error') {
              submitMessage = 'サーバーエラーが発生しました。';
            }

            // フォームの状態を更新
            await update();
          };
        }}
      >
        <div class="card bg-base-100 shadow-md">
          <div class="card-body">
            <div class="space-y-8">
              <!-- GAS Script ID -->
              <fieldset class="fieldset">
                <legend class="fieldset-legend">
                  {gas_script_id_label()} <span class="text-error">*</span>
                </legend>
                <input
                  type="text"
                  name="scriptId"
                  id="script-id"
                  class="input input-bordered w-full"
                  placeholder={gas_script_id_placeholder()}
                  required
                  disabled={isSubmitting}
                />
                <div class="label">
                  <span class="label-text-alt opacity-70">{gas_script_id_help()}</span>
                </div>
              </fieldset>

              <!-- GitHub Repository URL -->
              <fieldset class="fieldset">
                <legend class="fieldset-legend">
                  {github_repository_url_label()} <span class="text-error">*</span>
                </legend>
                <label class="input input-bordered flex items-center gap-2">
                  <span class="opacity-60">https://github.com/</span>
                  <input
                    type="text"
                    name="repoUrl"
                    id="repo-url"
                    class="grow"
                    placeholder={github_repository_url_placeholder()}
                    required
                    disabled={isSubmitting}
                  />
                </label>
                <div class="label">
                  <span class="label-text-alt opacity-70">{github_repository_url_help()}</span>
                </div>
              </fieldset>
            </div>
          </div>

          <!-- Card Actions -->
          <div class="card-actions bg-base-200 justify-end px-6 py-4">
            <button
              type="button"
              onclick={handleCancel}
              disabled={isSubmitting}
              class="btn btn-outline"
            >
              {cancel()}
            </button>
            <button type="submit" disabled={isSubmitting} class="btn btn-primary">
              {#if isSubmitting}
                <span class="loading loading-spinner loading-sm"></span>
                {submitting_request()}
              {:else}
                {submit_request()}
              {/if}
            </button>
          </div>
        </div>
      </form>

      <!-- 追加申請についての説明 -->
      <div class="card bg-base-100 mt-12 shadow-md">
        <div class="card-body">
          <h2 class="card-title text-xl">{add_request_about()}</h2>
          <div class="space-y-4 text-sm opacity-80">
            <div>
              <h3 class="font-medium opacity-100">1. {add_request_flow()}</h3>
              <p>{add_request_flow_description()}</p>
            </div>
            <div>
              <h3 class="font-medium opacity-100">2. {add_request_conditions()}</h3>
              <ul class="mt-2 ml-4 list-inside list-disc">
                <li>{add_request_conditions_description()}</li>
                <li>{add_request_conditions_github()}</li>
                <li>{add_request_conditions_docs()}</li>
                <li>{add_request_conditions_value()}</li>
              </ul>
            </div>
            <div>
              <h3 class="font-medium opacity-100">3. {add_request_review()}</h3>
              <p>{add_request_review_description()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </main>
</div>
