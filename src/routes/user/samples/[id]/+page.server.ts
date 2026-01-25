import { error } from '@sveltejs/kit';
import { SampleCodeRepository } from '$lib/server/repositories/sample-code-repository.js';
import { ToggleSampleLikeService } from '$lib/server/services/toggle-sample-like-service.js';
import { db } from '$lib/server/db/index.js';
import { user } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
  const sample = await SampleCodeRepository.findById(params.id);

  if (!sample) {
    throw error(404, 'サンプルコードが見つかりません');
  }

  // 非公開サンプルは作者のみ閲覧可能
  if (sample.status !== 'published' && sample.authorId !== locals.user?.id) {
    throw error(404, 'サンプルコードが見つかりません');
  }

  // 閲覧数をインクリメント
  await SampleCodeRepository.incrementViewCount(sample.id);

  // 作者情報を取得
  const authorResult = await db
    .select({ id: user.id, name: user.name, picture: user.picture })
    .from(user)
    .where(eq(user.id, sample.authorId))
    .limit(1);
  const author = authorResult[0] ?? null;

  // ログインユーザーの場合、いいね状態を取得
  let liked = false;
  if (locals.user) {
    liked = await ToggleSampleLikeService.hasLiked(locals.user.id, sample.id);
  }

  // 所有者かどうか
  const isOwner = locals.user?.id === sample.authorId;

  return {
    sample: { ...sample, viewCount: sample.viewCount + 1 },
    author,
    liked,
    isOwner,
  };
};
