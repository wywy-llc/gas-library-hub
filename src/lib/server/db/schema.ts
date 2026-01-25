import { index, integer, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import type { UsageExampleAnnotated } from '$lib/types/library-summary.js';
import type { ScriptValidationStatus } from '$lib/server/utils/gas-script-validator.js';

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  picture: text('picture'),
  googleId: text('google_id').notNull().unique(),
  createdAt: timestamp('created_at', {
    withTimezone: true,
    mode: 'date',
  })
    .notNull()
    .defaultNow(),
});

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id),
  expiresAt: timestamp('expires_at', {
    withTimezone: true,
    mode: 'date',
  }).notNull(),
});

export const library = pgTable(
  'library',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    scriptId: text('script_id').notNull().unique(),
    repositoryUrl: text('repository_url').notNull().unique(),
    authorUrl: text('author_url').notNull(),
    authorName: text('author_name').notNull(),
    description: text('description').notNull(),
    starCount: integer('star_count').default(0).notNull(),
    copyCount: integer('copy_count').default(0).notNull(),
    licenseType: text('license_type').notNull(),
    licenseUrl: text('license_url').notNull(),
    lastCommitAt: timestamp('last_commit_at', {
      withTimezone: true,
      mode: 'date',
    }).notNull(),
    status: text('status', { enum: ['pending', 'published', 'rejected'] })
      .notNull()
      .default('pending'),
    scriptType: text('script_type', { enum: ['library', 'web_app'] })
      .notNull()
      .default('library'),
    // スクリプトID検証ステータス
    scriptValidationStatus: text('script_validation_status', {
      enum: ['accessible', 'inaccessible', 'not_found', 'unknown'],
    }).$type<ScriptValidationStatus>(),
    // 申請者情報（ユーザー申請の場合のみ）
    requesterId: text('requester_id').references(() => user.id),
    requestNote: text('request_note'), // 申請時のメモ
    createdAt: timestamp('created_at', {
      withTimezone: true,
      mode: 'date',
    })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', {
      withTimezone: true,
      mode: 'date',
    })
      .notNull()
      .defaultNow(),
  },
  table => ({
    // パフォーマンス最適化: status + scriptType + starCount + copyCount の複合インデックス
    statusScriptTypeStarCountIdx: index('library_status_script_type_star_count_idx').on(
      table.status,
      table.scriptType,
      table.starCount,
      table.copyCount
    ),
  })
);

export const librarySummary = pgTable('library_summary', {
  id: text('id').primaryKey(),
  libraryId: text('library_id')
    .notNull()
    .references(() => library.id)
    .unique(),
  // basicInfo
  libraryNameJa: text('library_name_ja'),
  libraryNameEn: text('library_name_en'),
  purposeJa: text('purpose_ja'),
  purposeEn: text('purpose_en'),
  targetUsersJa: text('target_users_ja'),
  targetUsersEn: text('target_users_en'),
  tagsJa: jsonb('tags_ja').$type<string[]>(),
  tagsEn: jsonb('tags_en').$type<string[]>(),
  // functionality
  coreProblemJa: text('core_problem_ja'),
  coreProblemEn: text('core_problem_en'),
  mainBenefits: jsonb('main_benefits').$type<
    Array<{
      title: {
        ja: string;
        en: string;
      };
      description: {
        ja: string;
        en: string;
      };
    }>
  >(),
  usageExampleJa: text('usage_example_ja'),
  usageExampleEn: text('usage_example_en'),
  usageExample: jsonb('usage_example').$type<UsageExampleAnnotated>(),
  // seoInfo
  seoTitleJa: text('seo_title_ja'),
  seoTitleEn: text('seo_title_en'),
  seoDescriptionJa: text('seo_description_ja'),
  seoDescriptionEn: text('seo_description_en'),
  createdAt: timestamp('created_at', {
    withTimezone: true,
    mode: 'date',
  })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', {
    withTimezone: true,
    mode: 'date',
  })
    .notNull()
    .defaultNow(),
});

export type Session = typeof session.$inferSelect;

export type User = typeof user.$inferSelect;

export type Library = typeof library.$inferSelect;

export type LibrarySummaryRecord = typeof librarySummary.$inferSelect;

// ==================== Sample Code Tables ====================

/**
 * サンプルコード本体
 * Googleドキュメント（スプレッドシート、ドキュメント、スライド、GAS）のサンプルを管理
 */
export const sampleCode = pgTable(
  'sample_code',
  {
    id: text('id').primaryKey(),
    libraryId: text('library_id').references(() => library.id), // nullable - ライブラリに紐づかない場合もある
    authorId: text('author_id')
      .notNull()
      .references(() => user.id),
    title: text('title').notNull(),
    description: text('description').notNull(),
    documentType: text('document_type', {
      enum: ['spreadsheet', 'document', 'slides', 'apps_script'],
    }).notNull(),
    originalUrl: text('original_url').notNull(),
    copyUrl: text('copy_url').notNull(), // 変換後の「コピーを作成」URL
    tags: jsonb('tags').$type<string[]>().default([]).notNull(),
    status: text('status', { enum: ['draft', 'published', 'archived'] })
      .notNull()
      .default('published'), // ログイン必須で即公開、管理者が取り下げ可能
    copyCount: integer('copy_count').default(0).notNull(),
    likeCount: integer('like_count').default(0).notNull(),
    viewCount: integer('view_count').default(0).notNull(),
    createdAt: timestamp('created_at', {
      withTimezone: true,
      mode: 'date',
    })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', {
      withTimezone: true,
      mode: 'date',
    })
      .notNull()
      .defaultNow(),
  },
  table => ({
    authorIdIdx: index('sample_code_author_id_idx').on(table.authorId),
    statusIdx: index('sample_code_status_idx').on(table.status),
    libraryIdIdx: index('sample_code_library_id_idx').on(table.libraryId),
  })
);

/**
 * サンプルコードへのいいね
 */
export const sampleLike = pgTable(
  'sample_like',
  {
    id: text('id').primaryKey(),
    sampleCodeId: text('sample_code_id')
      .notNull()
      .references(() => sampleCode.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', {
      withTimezone: true,
      mode: 'date',
    })
      .notNull()
      .defaultNow(),
  },
  table => ({
    uniqueUserSample: index('sample_like_user_sample_unique_idx').on(
      table.userId,
      table.sampleCodeId
    ),
    sampleCodeIdIdx: index('sample_like_sample_code_id_idx').on(table.sampleCodeId),
  })
);

/**
 * サンプルコードのコピー履歴（トレンド分析用）
 */
export const sampleCopy = pgTable(
  'sample_copy',
  {
    id: text('id').primaryKey(),
    sampleCodeId: text('sample_code_id')
      .notNull()
      .references(() => sampleCode.id, { onDelete: 'cascade' }),
    userId: text('user_id').references(() => user.id, { onDelete: 'set null' }), // nullable - 未ログインユーザーの場合
    sessionId: text('session_id'), // 匿名ユーザー識別用
    createdAt: timestamp('created_at', {
      withTimezone: true,
      mode: 'date',
    })
      .notNull()
      .defaultNow(),
  },
  table => ({
    sampleCodeIdIdx: index('sample_copy_sample_code_id_idx').on(table.sampleCodeId),
    createdAtIdx: index('sample_copy_created_at_idx').on(table.createdAt),
  })
);

/**
 * ユーザー通知（サイト内通知のみ）
 */
export const userNotification = pgTable(
  'user_notification',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    type: text('type', { enum: ['like', 'copy'] }).notNull(),
    sampleCodeId: text('sample_code_id')
      .notNull()
      .references(() => sampleCode.id, { onDelete: 'cascade' }),
    actorId: text('actor_id').references(() => user.id, { onDelete: 'set null' }), // nullable - 匿名ユーザーの場合
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}).notNull(),
    isRead: integer('is_read').default(0).notNull(), // 0: 未読, 1: 既読
    createdAt: timestamp('created_at', {
      withTimezone: true,
      mode: 'date',
    })
      .notNull()
      .defaultNow(),
  },
  table => ({
    userIdIsReadIdx: index('user_notification_user_id_is_read_idx').on(table.userId, table.isRead),
    createdAtIdx: index('user_notification_created_at_idx').on(table.createdAt),
  })
);

// Type exports for new tables
export type SampleCode = typeof sampleCode.$inferSelect;
export type SampleCodeInsert = typeof sampleCode.$inferInsert;

export type SampleLike = typeof sampleLike.$inferSelect;
export type SampleLikeInsert = typeof sampleLike.$inferInsert;

export type SampleCopy = typeof sampleCopy.$inferSelect;
export type SampleCopyInsert = typeof sampleCopy.$inferInsert;

export type UserNotification = typeof userNotification.$inferSelect;
export type UserNotificationInsert = typeof userNotification.$inferInsert;

export type DocumentType = 'spreadsheet' | 'document' | 'slides' | 'apps_script';
export type SampleCodeStatus = 'draft' | 'published' | 'archived';
export type NotificationType = 'like' | 'copy';
