import * as Factory from 'factory.ts';
import {
  sampleCode,
  type SampleCode,
  type DocumentType,
  type SampleCodeStatus,
} from '../../src/lib/server/db/schema';
import {
  createDatabaseFactoryWrapper,
  createFactoryWrapper,
  generateUniqueId,
  type FactoryWrapper,
} from './base.factory';

/**
 * ドキュメントタイプ定数
 */
export const DOCUMENT_TYPES = {
  SPREADSHEET: 'spreadsheet',
  DOCUMENT: 'document',
  SLIDES: 'slides',
  APPS_SCRIPT: 'apps_script',
} as const;

/**
 * サンプルコードステータス定数
 */
export const SAMPLE_CODE_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
} as const;

/**
 * サンプルコード作成用入力データ
 */
export type CreateSampleCodeInput = Omit<
  typeof sampleCode.$inferInsert,
  'id' | 'createdAt' | 'updatedAt'
>;

/**
 * データベース作成用のサンプルコード情報
 */
export interface DatabaseSampleCodeData extends CreateSampleCodeInput {
  id: string;
}

/**
 * テスト用のサンプルコードデータ
 */
export type SampleCodeTestData = CreateSampleCodeInput;

/**
 * 作成済みサンプルコードデータ
 */
export type { SampleCode } from '../../src/lib/server/db/schema';
export type CreatedSampleCodeTestData = SampleCode;

// ベースファクトリ定義
const baseSampleCodeFactory = Factory.Sync.makeFactory<SampleCodeTestData>({
  authorId: Factory.each(i => `user_${i + 1}`),
  libraryId: null,
  title: Factory.each(i => `サンプルコード ${i + 1}`),
  description: 'これはテスト用のサンプルコードです。スプレッドシートの自動化テンプレートです。',
  documentType: DOCUMENT_TYPES.SPREADSHEET as DocumentType,
  originalUrl: Factory.each(
    i => `https://docs.google.com/spreadsheets/d/sample_doc_id_${i + 1}/edit`
  ),
  copyUrl: Factory.each(i => `https://docs.google.com/spreadsheets/d/sample_doc_id_${i + 1}/copy`),
  tags: ['自動化', 'スプレッドシート'],
  status: SAMPLE_CODE_STATUS.PUBLISHED as SampleCodeStatus,
  copyCount: 0,
  likeCount: 0,
  viewCount: 0,
});

/**
 * サンプルコードテストデータのFactory群
 */
export const SampleCodeTestDataFactories: Record<string, FactoryWrapper<SampleCodeTestData>> = {
  /** デフォルト: 公開済みスプレッドシートサンプル */
  default: createFactoryWrapper(baseSampleCodeFactory),

  /** ドキュメントサンプル */
  document: createFactoryWrapper(
    baseSampleCodeFactory.extend({
      title: 'ドキュメントテンプレート',
      description: 'Google ドキュメントのテンプレートです。',
      documentType: DOCUMENT_TYPES.DOCUMENT as DocumentType,
      originalUrl: 'https://docs.google.com/document/d/doc_sample_id/edit',
      copyUrl: 'https://docs.google.com/document/d/doc_sample_id/copy',
      tags: ['テンプレート', 'ドキュメント'],
    })
  ),

  /** スライドサンプル */
  slides: createFactoryWrapper(
    baseSampleCodeFactory.extend({
      title: 'プレゼンテーションテンプレート',
      description: 'Google スライドのテンプレートです。',
      documentType: DOCUMENT_TYPES.SLIDES as DocumentType,
      originalUrl: 'https://docs.google.com/presentation/d/slides_sample_id/edit',
      copyUrl: 'https://docs.google.com/presentation/d/slides_sample_id/copy',
      tags: ['プレゼン', 'スライド'],
    })
  ),

  /** Apps Scriptサンプル */
  appsScript: createFactoryWrapper(
    baseSampleCodeFactory.extend({
      title: 'Apps Script サンプル',
      description: 'Google Apps Script のサンプルコードです。',
      documentType: DOCUMENT_TYPES.APPS_SCRIPT as DocumentType,
      originalUrl: 'https://script.google.com/d/gas_sample_id/edit',
      copyUrl: 'https://script.google.com/d/gas_sample_id/edit?copyDoc=true',
      tags: ['GAS', 'スクリプト'],
    })
  ),

  /** 下書きサンプル */
  draft: createFactoryWrapper(
    baseSampleCodeFactory.extend({
      title: '下書きサンプル',
      status: SAMPLE_CODE_STATUS.DRAFT as SampleCodeStatus,
    })
  ),

  /** アーカイブ済みサンプル */
  archived: createFactoryWrapper(
    baseSampleCodeFactory.extend({
      title: 'アーカイブ済みサンプル',
      status: SAMPLE_CODE_STATUS.ARCHIVED as SampleCodeStatus,
    })
  ),

  /** 人気サンプル（いいね・コピー数多め） */
  popular: createFactoryWrapper(
    baseSampleCodeFactory.extend({
      title: '人気のサンプルコード',
      copyCount: 100,
      likeCount: 50,
      viewCount: 500,
    })
  ),
};

// データベース用ファクトリ
const databaseSampleCodeFactory = Factory.Sync.makeFactory<DatabaseSampleCodeData>({
  id: Factory.each(() => generateUniqueId('sample')),
  ...baseSampleCodeFactory.build(),
});

/**
 * データベース保存対応のサンプルコードファクトリ
 */
export const DatabaseSampleCodeDataFactory = createDatabaseFactoryWrapper<DatabaseSampleCodeData>(
  'sample_code',
  databaseSampleCodeFactory,
  async (db, data) => {
    const result = await db
      .insert(sampleCode)
      .values({
        id: data.id,
        libraryId: data.libraryId,
        authorId: data.authorId,
        title: data.title,
        description: data.description,
        documentType: data.documentType,
        originalUrl: data.originalUrl,
        copyUrl: data.copyUrl,
        tags: data.tags,
        status: data.status,
        copyCount: data.copyCount,
        likeCount: data.likeCount,
        viewCount: data.viewCount,
      })
      .returning({ id: sampleCode.id });
    return result[0].id;
  }
);
