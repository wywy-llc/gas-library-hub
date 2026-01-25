<script lang="ts">
  import {
    notification_title,
    notification_like_message,
    notification_copy_message,
    notification_anonymous_copy_message,
    notification_mark_all_read,
    notification_no_notifications,
  } from '$lib/paraglide/messages.js';
  import { getLocale } from '$lib/paraglide/runtime.js';
  import type { UserNotification } from '$lib/server/db/schema.js';

  interface NotificationWithActor extends UserNotification {
    actorName?: string;
    sampleTitle?: string;
  }

  interface Props {
    notifications: NotificationWithActor[];
    onMarkAllRead?: () => void;
    onMarkRead?: (id: string) => void;
  }

  let { notifications, onMarkAllRead, onMarkRead }: Props = $props();

  let currentLocale = $derived(getLocale());

  function formatDate(date: Date): string {
    return currentLocale === 'ja'
      ? new Date(date).toLocaleDateString('ja-JP', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : new Date(date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
  }

  function getMessage(notification: NotificationWithActor): string {
    const sampleTitle = notification.sampleTitle ?? 'Unknown';
    const actorName = notification.actorName ?? 'Unknown';

    if (notification.type === 'like') {
      return notification_like_message({ actorName, sampleTitle });
    } else if (notification.type === 'copy') {
      if (notification.actorId) {
        return notification_copy_message({ actorName, sampleTitle });
      } else {
        return notification_anonymous_copy_message({ sampleTitle });
      }
    }
    return '';
  }
</script>

<div class="bg-base-100 rounded-box border-base-200 border">
  <div class="border-base-200 flex items-center justify-between border-b p-4">
    <h3 class="font-medium">{notification_title()}</h3>
    {#if notifications.length > 0 && onMarkAllRead}
      <button type="button" class="btn btn-ghost btn-xs" onclick={onMarkAllRead}>
        {notification_mark_all_read()}
      </button>
    {/if}
  </div>

  {#if notifications.length === 0}
    <div class="text-base-content/60 p-8 text-center">
      {notification_no_notifications()}
    </div>
  {:else}
    <ul class="divide-base-200 divide-y">
      {#each notifications as notification}
        <li
          class="cursor-pointer p-4 transition-colors {notification.isRead === 0
            ? 'bg-primary/5'
            : ''} hover:bg-base-200/50"
          onclick={() => onMarkRead?.(notification.id)}
          role="button"
          tabindex="0"
          onkeydown={e => e.key === 'Enter' && onMarkRead?.(notification.id)}
        >
          <div class="flex items-start gap-3">
            <span class="text-xl">
              {notification.type === 'like' ? '❤️' : '📋'}
            </span>
            <div class="min-w-0 flex-1">
              <p class="text-sm">
                {getMessage(notification)}
              </p>
              <time class="text-base-content/60 text-xs">
                {formatDate(notification.createdAt)}
              </time>
            </div>
            {#if notification.isRead === 0}
              <span class="badge badge-primary badge-xs">NEW</span>
            {/if}
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</div>
