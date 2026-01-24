/**
 * ライブラリ要約情報の型定義
 */

/**
 * 多言語テキスト（日本語・英語）
 */
export interface BilingualText {
  ja: string;
  en: string;
}

/**
 * usageExample の構造化された形式（Annotated形式）
 *
 * - functions: 主要関数一覧（名前と1行要約）
 * - examples: 使用例（1-3個、タイトル・コード・解説）
 */
export interface UsageExampleAnnotated {
  functions: Array<{
    name: string;
    summary: BilingualText; // ja: 20字以内, en: 30字以内
  }>;
  examples: Array<{
    title: BilingualText;
    code: string;
    explanation: BilingualText;
  }>;
}

export interface LibrarySummary {
  basicInfo: {
    libraryName: BilingualText;
    purpose: BilingualText;
    targetUsers: BilingualText;
    tags: {
      en: string[];
      ja: string[];
    };
  };
  functionality: {
    coreProblem: BilingualText;
    mainBenefits: Array<{
      title: BilingualText;
      description: BilingualText;
    }>;
    usageExample: UsageExampleAnnotated;
  };
  seoInfo: {
    title: BilingualText;
    description: BilingualText;
  };
}

/**
 * ライブラリ要約生成用のパラメータ
 */
export interface LibrarySummaryParams {
  githubUrl: string;
}

/**
 * データベーススキーマに対応したライブラリ要約の型定義
 */
export interface LibrarySummaryRecord {
  id: string;
  libraryId: string;
  libraryNameJa: string | null;
  libraryNameEn: string | null;
  purposeJa: string | null;
  purposeEn: string | null;
  targetUsersJa: string | null;
  targetUsersEn: string | null;
  tagsJa: string[] | null;
  tagsEn: string[] | null;
  coreProblemJa: string | null;
  coreProblemEn: string | null;
  mainBenefits: Array<{
    title: BilingualText;
    description: BilingualText;
  }> | null;
  /** @deprecated 旧形式。usageExample に移行予定 */
  usageExampleJa: string | null;
  /** @deprecated 旧形式。usageExample に移行予定 */
  usageExampleEn: string | null;
  /** 新形式: 構造化された使用例 */
  usageExample: UsageExampleAnnotated | null;
  seoTitleJa: string | null;
  seoTitleEn: string | null;
  seoDescriptionJa: string | null;
  seoDescriptionEn: string | null;
  createdAt: Date;
  updatedAt: Date;
}
