import { redirect, fail } from '@sveltejs/kit';
import {
  CreateSampleCodeService,
  CreateSampleCodeError,
} from '$lib/server/services/create-sample-code-service.js';
import { db } from '$lib/server/db/index.js';
import { library } from '$lib/server/db/schema.js';
import { LIBRARY_STATUS } from '$lib/constants/library-status.js';
import { and, eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
  if (!locals.user) {
    throw redirect(302, '/auth/register?redirect=/user/samples/new');
  }

  // クエリパラメータからlibraryIdを取得
  const libraryId = url.searchParams.get('libraryId');
  let relatedLibrary: { id: string; name: string } | null = null;

  if (libraryId) {
    // ライブラリが存在し公開されているか確認
    const [libraryData] = await db
      .select({ id: library.id, name: library.name })
      .from(library)
      .where(and(eq(library.id, libraryId), eq(library.status, LIBRARY_STATUS.PUBLISHED)))
      .limit(1);

    if (libraryData) {
      relatedLibrary = libraryData;
    }
  }

  return { relatedLibrary };
};

export const actions: Actions = {
  default: async ({ request, locals }) => {
    if (!locals.user) {
      return fail(401, { error: 'ログインが必要です。' });
    }

    const formData = await request.formData();
    const title = formData.get('title')?.toString()?.trim() ?? '';
    const description = formData.get('description')?.toString()?.trim() ?? '';
    const originalUrl = formData.get('originalUrl')?.toString()?.trim() ?? '';
    const tagsRaw = formData.get('tags')?.toString()?.trim() ?? '';
    const libraryId = formData.get('libraryId')?.toString()?.trim() || undefined;
    const tags = tagsRaw
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    try {
      const result = await CreateSampleCodeService.call({
        authorId: locals.user.id,
        title,
        description,
        originalUrl,
        tags,
        libraryId,
      });

      throw redirect(303, `/user/samples/${result.sample.id}`);
    } catch (error) {
      if (error instanceof CreateSampleCodeError) {
        return fail(400, {
          error: error.message,
          values: { title, description, originalUrl, tags: tagsRaw },
        });
      }
      throw error;
    }
  },
};
