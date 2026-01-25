import { db } from '$lib/server/db/index.js';
import { user } from '$lib/server/db/schema.js';
import { LibraryRepository } from '$lib/server/repositories/library-repository.js';
import { SampleCodeRepository } from '$lib/server/repositories/sample-code-repository.js';
import { ToggleSampleLikeService } from '$lib/server/services/toggle-sample-like-service.js';
import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

/** 閲覧済みサンプルを追跡するCookie名 */
const VIEWED_SAMPLES_COOKIE = 'viewed_samples';

/**
 * Cookieから閲覧済みサンプルIDのSetを取得
 */
function getViewedSamples(cookieValue: string | undefined): Set<string> {
  if (!cookieValue) return new Set();
  try {
    const ids = JSON.parse(cookieValue);
    return new Set(Array.isArray(ids) ? ids : []);
  } catch {
    return new Set();
  }
}

export const load: PageServerLoad = async ({ params, locals, cookies }) => {
  const sample = await SampleCodeRepository.findById(params.id);

  if (!sample) {
    throw error(404, 'サンプルコードが見つかりません');
  }

  // 非公開サンプルは作者のみ閲覧可能
  const isOwner = locals.user?.id === sample.authorId;
  if (sample.status !== 'published' && !isOwner) {
    throw error(404, 'サンプルコードが見つかりません');
  }

  // 閲覧数をインクリメント（セッション内で未閲覧かつ作者本人でない場合のみ）
  const viewedSamples = getViewedSamples(cookies.get(VIEWED_SAMPLES_COOKIE));
  const alreadyViewed = viewedSamples.has(sample.id);
  let viewCountIncremented = false;

  if (!isOwner && !alreadyViewed) {
    // Fire-and-forget: ページ表示をブロックしない
    SampleCodeRepository.incrementViewCount(sample.id).catch(() => {
      // エラーは無視（閲覧数の欠損は許容）
    });
    viewCountIncremented = true;

    // 閲覧済みとして記録（最大100件まで保持）
    viewedSamples.add(sample.id);
    const viewedArray = Array.from(viewedSamples).slice(-100);
    cookies.set(VIEWED_SAMPLES_COOKIE, JSON.stringify(viewedArray), {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24時間
    });
  }

  // 作者情報、いいね状態、関連ライブラリを並列取得
  const [authorResult, liked, relatedLibrary] = await Promise.all([
    db
      .select({ id: user.id, name: user.name, picture: user.picture })
      .from(user)
      .where(eq(user.id, sample.authorId))
      .limit(1),
    locals.user
      ? ToggleSampleLikeService.hasLiked(locals.user.id, sample.id)
      : Promise.resolve(false),
    sample.libraryId ? LibraryRepository.findById(sample.libraryId) : Promise.resolve(null),
  ]);
  const author = authorResult[0] ?? null;

  return {
    sample: { ...sample, viewCount: sample.viewCount + (viewCountIncremented ? 1 : 0) },
    author,
    liked,
    isOwner,
    relatedLibrary: relatedLibrary ? { id: relatedLibrary.id, name: relatedLibrary.name } : null,
  };
};
