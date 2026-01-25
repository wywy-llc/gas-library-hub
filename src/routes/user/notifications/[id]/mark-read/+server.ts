import { UserNotificationRepository } from '$lib/server/repositories/user-notification-repository.js';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals, params }) => {
  if (!locals.user) {
    throw error(401, 'ログインが必要です');
  }

  const notification = await UserNotificationRepository.findById(params.id);

  if (!notification) {
    throw error(404, '通知が見つかりません');
  }

  if (notification.userId !== locals.user.id) {
    throw error(403, 'この通知を更新する権限がありません');
  }

  await UserNotificationRepository.markAsRead(params.id);

  return json({ success: true });
};
