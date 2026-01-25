<script lang="ts">
  import {
    dashboard_title,
    dashboard_summary_title,
    dashboard_trend_title,
    dashboard_no_data,
    dashboard_start_contributing,
    sample_create_first,
  } from '$lib/paraglide/messages.js';
  import DashboardSummary from '$lib/components/dashboard/DashboardSummary.svelte';
  import TrendChart from '$lib/components/dashboard/TrendChart.svelte';
  import SamplePerformanceTable from '$lib/components/dashboard/SamplePerformanceTable.svelte';
  import NotificationList from '$lib/components/dashboard/NotificationList.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  async function handleMarkAllRead() {
    try {
      await fetch('/user/notifications/mark-all-read', { method: 'POST' });
      // ページを再読み込みして通知状態を更新
      window.location.reload();
    } catch (e) {
      console.error('Mark all read failed:', e);
    }
  }
</script>

<svelte:head>
  <title>{dashboard_title()}</title>
</svelte:head>

<div class="container mx-auto px-4 py-8">
  <h1 class="mb-6 text-2xl font-bold">{dashboard_title()}</h1>

  {#if data.dashboard.summary.totalSamples === 0}
    <div class="py-16 text-center">
      <p class="text-base-content/60 mb-2 text-lg">{dashboard_no_data()}</p>
      <p class="text-base-content/40 mb-6 text-sm">{dashboard_start_contributing()}</p>
      <a href="/user/samples/new" class="btn btn-primary">
        {sample_create_first()}
      </a>
    </div>
  {:else}
    <div class="space-y-6">
      <section>
        <h2 class="mb-4 text-lg font-medium">{dashboard_summary_title()}</h2>
        <DashboardSummary
          totalSamples={data.dashboard.summary.totalSamples}
          totalCopies={data.dashboard.summary.totalCopies}
          totalLikes={data.dashboard.summary.totalLikes}
          totalViews={data.dashboard.summary.totalViews}
        />
      </section>

      <section>
        <h2 class="mb-4 text-lg font-medium">{dashboard_trend_title()}</h2>
        <TrendChart data={data.dashboard.trend} />
      </section>

      <div class="grid gap-6 lg:grid-cols-2">
        <section>
          <SamplePerformanceTable samples={data.dashboard.topSamples} />
        </section>

        <section>
          <NotificationList
            notifications={data.dashboard.recentNotifications}
            onMarkAllRead={handleMarkAllRead}
          />
        </section>
      </div>
    </div>
  {/if}
</div>
