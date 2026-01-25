<script lang="ts">
  import {
    dashboard_performance_title,
    dashboard_performance_sample,
    dashboard_performance_copies,
    dashboard_performance_likes,
    dashboard_performance_views,
    dashboard_performance_recent,
    dashboard_no_data,
  } from '$lib/paraglide/messages.js';
  import type { SampleCode } from '$lib/server/db/schema.js';

  interface SamplePerformance {
    sample: SampleCode;
    copyCount: number;
    likeCount: number;
    viewCount: number;
    recentCopies: number;
  }

  interface Props {
    samples: SamplePerformance[];
  }

  let { samples }: Props = $props();
</script>

<div class="bg-base-100 rounded-box border-base-200 overflow-hidden border">
  <div class="border-base-200 border-b p-4">
    <h3 class="font-medium">{dashboard_performance_title()}</h3>
  </div>

  {#if samples.length === 0}
    <div class="text-base-content/60 p-8 text-center">
      {dashboard_no_data()}
    </div>
  {:else}
    <div class="overflow-x-auto">
      <table class="table-sm table">
        <thead>
          <tr>
            <th>{dashboard_performance_sample()}</th>
            <th class="text-right">{dashboard_performance_copies()}</th>
            <th class="text-right">{dashboard_performance_likes()}</th>
            <th class="text-right">{dashboard_performance_views()}</th>
            <th class="text-right">{dashboard_performance_recent()}</th>
          </tr>
        </thead>
        <tbody>
          {#each samples as perf}
            <tr class="hover">
              <td>
                <a href="/user/samples/{perf.sample.id}" class="link link-hover line-clamp-1">
                  {perf.sample.title}
                </a>
              </td>
              <td class="text-right font-mono">{perf.copyCount}</td>
              <td class="text-right font-mono">{perf.likeCount}</td>
              <td class="text-right font-mono">{perf.viewCount}</td>
              <td class="text-right">
                {#if perf.recentCopies > 0}
                  <span class="badge badge-success badge-sm">+{perf.recentCopies}</span>
                {:else}
                  <span class="text-base-content/40">-</span>
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>
