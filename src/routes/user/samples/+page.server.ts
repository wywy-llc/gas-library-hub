import { SampleCodeRepository } from '$lib/server/repositories/sample-code-repository.js';
import { ToggleSampleLikeService } from '$lib/server/services/toggle-sample-like-service.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, locals }) => {
  const page = parseInt(url.searchParams.get('page') ?? '1', 10);
  const orderBy = (url.searchParams.get('orderBy') ?? 'createdAt') as
    | 'createdAt'
    | 'likeCount'
    | 'copyCount';
  const limit = 12;
  const offset = (page - 1) * limit;

  const { samples, total } = await SampleCodeRepository.findPublishedWithPagination({
    limit,
    offset,
    orderBy,
  });

  // ログインユーザーの場合、いいね状態を取得
  let likedSampleIds = new Set<string>();
  if (locals.user) {
    likedSampleIds = await ToggleSampleLikeService.getLikedSampleIds(
      locals.user.id,
      samples.map(s => s.id)
    );
  }

  return {
    samples,
    likedSampleIds: Array.from(likedSampleIds),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    orderBy,
  };
};
