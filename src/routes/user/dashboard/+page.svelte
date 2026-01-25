<script lang="ts">
  import { invalidateAll } from '$app/navigation';
  import DashboardSummary from '$lib/components/dashboard/DashboardSummary.svelte';
  import NotificationList from '$lib/components/dashboard/NotificationList.svelte';
  import SamplePerformanceTable from '$lib/components/dashboard/SamplePerformanceTable.svelte';
  import TrendChart from '$lib/components/dashboard/TrendChart.svelte';
  import {
    dashboard_no_data,
    dashboard_start_contributing,
    dashboard_summary_title,
    dashboard_title,
    dashboard_trend_title,
    sample_create_first,
  } from '$lib/paraglide/messages.js';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  async function handleMarkAllRead() {
    try {
      const response = await fetch('/user/notifications/mark-all-read', { method: 'POST' });
      if (response.ok) {
        await invalidateAll();
      }
    } catch (e) {
      console.error('Mark all read failed:', e);
    }
  }

  async function handleMarkRead(notificationId: string) {
    try {
      const response = await fetch(`/user/notifications/${notificationId}/mark-read`, {
        method: 'POST',
      });
      if (response.ok) {
        await invalidateAll();
      }
    } catch (e) {
      console.error('Mark read failed:', e);
    }
  }
</script>

<svelte:head>
  <title>{dashboard_title()}</title>
</svelte:head>

<main class="container mx-auto px-4 py-8">
  <h1 class="mb-8 text-3xl font-bold">{dashboard_title()}</h1>

  {#if data.dashboard.summary.totalSamples === 0}
    <div class="hero rounded-box bg-base-200 min-h-[60vh]">
      <div class="hero-content text-center">
        <div class="max-w-md">
          <h2 class="text-base-content/80 text-2xl font-semibold">
            {dashboard_no_data()}
          </h2>
          <p class="text-base-content/60 py-6">
            {dashboard_start_contributing()}
          </p>
          <a href="/user/samples/new" class="btn btn-primary" aria-label={sample_create_first()}>
            {sample_create_first()}
          </a>
        </div>
      </div>
    </div>
  {:else}
    <div class="space-y-8">
      <section aria-labelledby="summary-heading">
        <div class="card bg-base-100 shadow-sm">
          <div class="card-body">
            <h2 id="summary-heading" class="card-title text-lg">
              {dashboard_summary_title()}
            </h2>
            <DashboardSummary
              totalSamples={data.dashboard.summary.totalSamples}
              totalCopies={data.dashboard.summary.totalCopies}
              totalLikes={data.dashboard.summary.totalLikes}
              totalViews={data.dashboard.summary.totalViews}
            />
          </div>
        </div>
      </section>

      <section aria-labelledby="trend-heading">
        <div class="card bg-base-100 shadow-sm">
          <div class="card-body">
            <h2 id="trend-heading" class="card-title text-lg">
              {dashboard_trend_title()}
            </h2>
            <TrendChart data={data.dashboard.trend} />
          </div>
        </div>
      </section>

      <div class="grid gap-8 lg:grid-cols-2">
        <section aria-labelledby="performance-heading">
          <div class="card bg-base-100 h-full shadow-sm">
            <div class="card-body">
              <SamplePerformanceTable samples={data.dashboard.topSamples} />
            </div>
          </div>
        </section>

        <section aria-labelledby="notifications-heading">
          <div class="card bg-base-100 h-full shadow-sm">
            <div class="card-body">
              <NotificationList
                notifications={data.dashboard.recentNotifications}
                onMarkAllRead={handleMarkAllRead}
                onMarkRead={handleMarkRead}
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  {/if}
</main>
