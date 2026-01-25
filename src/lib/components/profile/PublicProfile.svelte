<script lang="ts">
  import {
    profile_samples_count,
    profile_total_copies,
    profile_total_likes,
    profile_member_since,
    profile_view_samples,
  } from '$lib/paraglide/messages.js';
  import { getLocale } from '$lib/paraglide/runtime.js';
  import type { User } from '$lib/server/db/schema.js';

  interface ProfileStats {
    totalSamples: number;
    totalCopies: number;
    totalLikes: number;
  }

  interface Props {
    user: User;
    stats: ProfileStats;
  }

  let { user, stats }: Props = $props();

  let currentLocale = $derived(getLocale());

  let memberSince = $derived(
    currentLocale === 'ja'
      ? new Date(user.createdAt).toLocaleDateString('ja-JP', {
          year: 'numeric',
          month: 'long',
        })
      : new Date(user.createdAt).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
        })
  );
</script>

<div class="bg-base-100 rounded-box border-base-200 border p-6">
  <div class="flex items-start gap-4">
    {#if user.picture}
      <img src={user.picture} alt={user.name} class="h-16 w-16 rounded-full" />
    {:else}
      <div class="bg-base-300 flex h-16 w-16 items-center justify-center rounded-full text-2xl">
        {user.name.charAt(0).toUpperCase()}
      </div>
    {/if}

    <div class="flex-1">
      <h2 class="text-xl font-bold">{user.name}</h2>
      <p class="text-base-content/60 text-sm">
        {profile_samples_count({ count: stats.totalSamples.toString() })}
      </p>
    </div>
  </div>

  <div class="mt-6 grid grid-cols-2 gap-4">
    <div class="bg-base-200 rounded-lg p-3 text-center">
      <div class="text-2xl font-bold">{stats.totalCopies}</div>
      <div class="text-base-content/60 text-xs">
        {profile_total_copies({ count: '' }).replace(': ', '')}
      </div>
    </div>
    <div class="bg-base-200 rounded-lg p-3 text-center">
      <div class="text-2xl font-bold">{stats.totalLikes}</div>
      <div class="text-base-content/60 text-xs">
        {profile_total_likes({ count: '' }).replace(': ', '')}
      </div>
    </div>
  </div>

  <div class="text-base-content/60 mt-4 text-sm">
    {profile_member_since()}: {memberSince}
  </div>

  <a href="/user/profile/{user.id}/samples" class="btn btn-outline btn-block mt-4">
    {profile_view_samples()}
  </a>
</div>
