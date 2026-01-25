<script lang="ts">
  import { dashboard_trend_copies } from '$lib/paraglide/messages.js';

  interface TrendData {
    date: string;
    copies: number;
  }

  interface Props {
    data: TrendData[];
    height?: number;
  }

  let { data, height = 200 }: Props = $props();

  // データの最大値を計算（0除算防止のため最低1）
  let maxValue = $derived(Math.max(...data.map(d => d.copies), 1));

  // バーの幅を計算（30日分）
  let barWidth = $derived(100 / data.length);
</script>

<div class="bg-base-100 rounded-box border-base-200 border p-4">
  <div class="mb-4 text-sm font-medium">{dashboard_trend_copies()}</div>

  <div class="relative" style="height: {height}px;">
    <svg class="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
      {#each data as point, i (point.date)}
        {@const barHeight = (point.copies / maxValue) * 100}
        <rect
          x={i * barWidth}
          y={100 - barHeight}
          width={barWidth * 0.8}
          height={barHeight}
          class="fill-primary opacity-70 transition-opacity hover:opacity-100"
        >
          <title>{point.date}: {point.copies}</title>
        </rect>
      {/each}
    </svg>

    <!-- Y軸ラベル -->
    <div
      class="text-base-content/60 absolute top-0 bottom-0 left-0 flex -translate-x-full flex-col justify-between pr-1 text-xs"
    >
      <span>{maxValue}</span>
      <span>{Math.floor(maxValue / 2)}</span>
      <span>0</span>
    </div>
  </div>

  <!-- X軸ラベル（日付の始まりと終わり） -->
  {#if data.length > 0}
    <div class="text-base-content/60 mt-2 flex justify-between text-xs">
      <span>{data[0].date}</span>
      <span>{data[data.length - 1].date}</span>
    </div>
  {/if}
</div>
