import { json, error } from '@sveltejs/kit';
import { UserNotificationRepository } from '$lib/server/repositories/user-notification-repository.js';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals }) => {
  if (!locals.user) {
    throw error(401, 'ログインが必要です');
  }

  await UserNotificationRepository.markAllAsRead(locals.user.id);

  return json({ success: true });
};
