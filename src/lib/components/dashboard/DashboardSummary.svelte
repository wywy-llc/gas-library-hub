<script lang="ts">
  import {
    dashboard_total_samples,
    dashboard_total_copies,
    dashboard_total_likes,
    dashboard_total_views,
  } from '$lib/paraglide/messages.js';

  interface Props {
    totalSamples: number;
    totalCopies: number;
    totalLikes: number;
    totalViews: number;
  }

  let { totalSamples, totalCopies, totalLikes, totalViews }: Props = $props();

  const stats = $derived([
    { label: dashboard_total_samples(), value: totalSamples, icon: '📝' },
    { label: dashboard_total_copies(), value: totalCopies, icon: '📋' },
    { label: dashboard_total_likes(), value: totalLikes, icon: '❤️' },
    { label: dashboard_total_views(), value: totalViews, icon: '👁️' },
  ]);
</script>

<div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
  {#each stats as stat (stat.label)}
    <div class="stat bg-base-100 rounded-box border-base-200 border p-4">
      <div class="stat-figure text-2xl">{stat.icon}</div>
      <div class="stat-title text-sm">{stat.label}</div>
      <div class="stat-value text-2xl">{stat.value.toLocaleString()}</div>
    </div>
  {/each}
</div>
