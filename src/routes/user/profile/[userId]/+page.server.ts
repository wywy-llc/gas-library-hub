import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { user } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { SampleCodeRepository } from '$lib/server/repositories/sample-code-repository.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
  // ユーザー情報を取得
  const userResult = await db.select().from(user).where(eq(user.id, params.userId)).limit(1);

  if (userResult.length === 0) {
    throw error(404, 'ユーザーが見つかりません');
  }

  const profileUser = userResult[0];

  // 公開サンプルを取得
  const samples = await SampleCodeRepository.findByAuthorId(params.userId, {
    status: 'published',
  });

  // 統計を計算
  const stats = {
    totalSamples: samples.length,
    totalCopies: samples.reduce((sum, s) => sum + s.copyCount, 0),
    totalLikes: samples.reduce((sum, s) => sum + s.likeCount, 0),
  };

  return {
    profileUser,
    samples,
    stats,
  };
};
