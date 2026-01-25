import { LIBRARY_STATUS } from '$lib/constants/library-status.js';
import { db } from '$lib/server/db/index.js';
import { library } from '$lib/server/db/schema.js';
import { SampleCodeRepository } from '$lib/server/repositories/sample-code-repository.js';
import {
  CreateSampleCodeError,
  CreateSampleCodeService,
} from '$lib/server/services/create-sample-code-service.js';
import { error, fail, redirect } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
  if (!locals.user) {
    throw redirect(302, `/auth/register?redirect=/user/samples/${params.id}/edit`);
  }

  const sample = await SampleCodeRepository.findById(params.id);

  if (!sample) {
    throw error(404, 'サンプルコードが見つかりません');
  }

  // 作者のみ編集可能
  if (sample.authorId !== locals.user.id) {
    throw error(403, 'このサンプルコードを編集する権限がありません');
  }

  // 関連ライブラリ情報を取得
  let relatedLibrary: { id: string; name: string } | null = null;
  if (sample.libraryId) {
    const [libraryData] = await db
      .select({ id: library.id, name: library.name })
      .from(library)
      .where(and(eq(library.id, sample.libraryId), eq(library.status, LIBRARY_STATUS.PUBLISHED)))
      .limit(1);

    if (libraryData) {
      relatedLibrary = libraryData;
    }
  }

  return {
    sample,
    relatedLibrary,
  };
};

export const actions: Actions = {
  default: async ({ request, params, locals }) => {
    if (!locals.user) {
      return fail(401, { error: 'ログインが必要です。' });
    }

    const formData = await request.formData();
    const title = formData.get('title')?.toString()?.trim() ?? '';
    const description = formData.get('description')?.toString()?.trim() ?? '';
    const tagsRaw = formData.get('tags')?.toString()?.trim() ?? '';
    const tags = tagsRaw
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    try {
      await CreateSampleCodeService.update({
        sampleId: params.id,
        authorId: locals.user.id,
        title,
        description,
        tags,
      });

      throw redirect(303, `/user/samples/${params.id}`);
    } catch (err) {
      if (err instanceof CreateSampleCodeError) {
        return fail(400, {
          error: err.message,
          values: { title, description, tags: tagsRaw },
        });
      }
      throw err;
    }
  },
};
