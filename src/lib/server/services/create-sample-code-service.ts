import type { DocumentType, SampleCode, SampleCodeInsert } from '$lib/server/db/schema.js';
import { SampleCodeRepository } from '$lib/server/repositories/sample-code-repository.js';
import {
  GoogleDocUrlTransformError,
  GoogleDocUrlTransformService,
} from '$lib/server/services/google-doc-url-transform-service.js';
import { generateId } from '$lib/server/utils/generate-id.js';

/**
 * サンプルコード作成パラメータ
 */
export interface CreateSampleCodeParams {
  authorId: string;
  title: string;
  description: string;
  originalUrl: string;
  libraryId?: string;
  tags?: string[];
}

/**
 * サンプルコード作成結果
 */
export interface CreateSampleCodeResult {
  success: true;
  sample: SampleCode;
}

/**
 * サンプルコード作成エラー
 */
export class CreateSampleCodeError extends Error {
  constructor(
    message: string,
    public readonly code: 'INVALID_URL' | 'UNSUPPORTED_TYPE' | 'VALIDATION_ERROR' | 'DATABASE_ERROR'
  ) {
    super(message);
    this.name = 'CreateSampleCodeError';
  }
}

/**
 * サンプルコード更新パラメータ
 */
export interface UpdateSampleCodeParams {
  sampleId: string;
  authorId: string; // 認可チェック用
  title?: string;
  description?: string;
  originalUrl?: string;
  tags?: string[];
}

/**
 * サンプルコード作成サービス
 *
 * 機能:
 * - GoogleドキュメントURLの検証と変換
 * - サンプルコードのCRUD操作
 * - ログイン必須、即公開フロー
 */
export const CreateSampleCodeService = (() => {
  /**
   * 入力バリデーション
   */
  const validateInput = (params: CreateSampleCodeParams): void => {
    if (!params.authorId) {
      throw new CreateSampleCodeError('ログインが必要です', 'VALIDATION_ERROR');
    }

    if (!params.title || params.title.trim().length === 0) {
      throw new CreateSampleCodeError('タイトルを入力してください', 'VALIDATION_ERROR');
    }

    if (params.title.length > 200) {
      throw new CreateSampleCodeError(
        'タイトルは200文字以内で入力してください',
        'VALIDATION_ERROR'
      );
    }

    if (!params.description || params.description.trim().length === 0) {
      throw new CreateSampleCodeError('説明を入力してください', 'VALIDATION_ERROR');
    }

    if (params.description.length > 50000) {
      throw new CreateSampleCodeError('説明は50000文字以内で入力してください', 'VALIDATION_ERROR');
    }

    if (!params.originalUrl || params.originalUrl.trim().length === 0) {
      throw new CreateSampleCodeError('URLを入力してください', 'VALIDATION_ERROR');
    }

    if (params.tags && params.tags.length > 10) {
      throw new CreateSampleCodeError('タグは10個以内で設定してください', 'VALIDATION_ERROR');
    }
  };

  return {
    /**
     * サンプルコードを作成
     *
     * @param params 作成パラメータ
     * @returns 作成されたサンプルコード
     * @throws CreateSampleCodeError バリデーションエラーまたはURL変換エラーの場合
     *
     * @example
     * ```typescript
     * const result = await CreateSampleCodeService.call({
     *   authorId: 'user123',
     *   title: 'スプレッドシート自動化テンプレート',
     *   description: 'データ入力を自動化するテンプレートです',
     *   originalUrl: 'https://docs.google.com/spreadsheets/d/abc123/edit',
     *   tags: ['自動化', 'スプレッドシート']
     * });
     * ```
     */
    call: async (params: CreateSampleCodeParams): Promise<CreateSampleCodeResult> => {
      // バリデーション
      validateInput(params);

      // URL変換
      let urlTransformResult;
      try {
        urlTransformResult = GoogleDocUrlTransformService.transform(params.originalUrl);
      } catch (error) {
        if (error instanceof GoogleDocUrlTransformError) {
          throw new CreateSampleCodeError(
            error.message,
            error.code === 'INVALID_URL' ? 'INVALID_URL' : 'UNSUPPORTED_TYPE'
          );
        }
        throw new CreateSampleCodeError('URLの変換に失敗しました', 'INVALID_URL');
      }

      // サンプルコード作成
      const sampleData: SampleCodeInsert = {
        id: generateId(),
        authorId: params.authorId,
        libraryId: params.libraryId ?? null,
        title: params.title.trim(),
        description: params.description.trim(),
        documentType: urlTransformResult.documentType,
        originalUrl: urlTransformResult.originalUrl,
        copyUrl: urlTransformResult.copyUrl,
        tags: params.tags ?? [],
        status: 'published', // ログイン必須で即公開
        copyCount: 0,
        likeCount: 0,
        viewCount: 0,
      };

      try {
        const sample = await SampleCodeRepository.create(sampleData);
        return { success: true, sample };
      } catch (error) {
        console.error('サンプルコード作成エラー:', error);
        throw new CreateSampleCodeError('サンプルコードの作成に失敗しました', 'DATABASE_ERROR');
      }
    },

    /**
     * サンプルコードを更新
     *
     * @param params 更新パラメータ
     * @returns 更新されたサンプルコード
     * @throws CreateSampleCodeError 認可エラーまたはバリデーションエラーの場合
     */
    update: async (params: UpdateSampleCodeParams): Promise<SampleCode> => {
      const existing = await SampleCodeRepository.findById(params.sampleId);

      if (!existing) {
        throw new CreateSampleCodeError('サンプルコードが見つかりません', 'VALIDATION_ERROR');
      }

      if (existing.authorId !== params.authorId) {
        throw new CreateSampleCodeError(
          'このサンプルコードを編集する権限がありません',
          'VALIDATION_ERROR'
        );
      }

      const updateData: Partial<SampleCodeInsert> = {};

      if (params.title !== undefined) {
        if (params.title.trim().length === 0) {
          throw new CreateSampleCodeError('タイトルを入力してください', 'VALIDATION_ERROR');
        }
        if (params.title.length > 200) {
          throw new CreateSampleCodeError(
            'タイトルは200文字以内で入力してください',
            'VALIDATION_ERROR'
          );
        }
        updateData.title = params.title.trim();
      }

      if (params.description !== undefined) {
        if (params.description.trim().length === 0) {
          throw new CreateSampleCodeError('説明を入力してください', 'VALIDATION_ERROR');
        }
        if (params.description.length > 50000) {
          throw new CreateSampleCodeError(
            '説明は50000文字以内で入力してください',
            'VALIDATION_ERROR'
          );
        }
        updateData.description = params.description.trim();
      }

      if (params.originalUrl !== undefined) {
        try {
          const urlTransformResult = GoogleDocUrlTransformService.transform(params.originalUrl);
          updateData.documentType = urlTransformResult.documentType;
          updateData.originalUrl = urlTransformResult.originalUrl;
          updateData.copyUrl = urlTransformResult.copyUrl;
        } catch (error) {
          if (error instanceof GoogleDocUrlTransformError) {
            throw new CreateSampleCodeError(
              error.message,
              error.code === 'INVALID_URL' ? 'INVALID_URL' : 'UNSUPPORTED_TYPE'
            );
          }
          throw new CreateSampleCodeError('URLの変換に失敗しました', 'INVALID_URL');
        }
      }

      if (params.tags !== undefined) {
        if (params.tags.length > 10) {
          throw new CreateSampleCodeError('タグは10個以内で設定してください', 'VALIDATION_ERROR');
        }
        updateData.tags = params.tags;
      }

      try {
        return await SampleCodeRepository.update(params.sampleId, updateData);
      } catch (error) {
        console.error('サンプルコード更新エラー:', error);
        throw new CreateSampleCodeError('サンプルコードの更新に失敗しました', 'DATABASE_ERROR');
      }
    },

    /**
     * URLがサポートされているか事前チェック
     */
    isUrlSupported: (url: string): boolean => {
      return GoogleDocUrlTransformService.isSupported(url);
    },

    /**
     * URLからドキュメントタイプを取得
     */
    getDocumentType: (url: string): DocumentType | null => {
      return GoogleDocUrlTransformService.getDocumentType(url);
    },
  } as const;
})();
