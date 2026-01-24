/**
 * ソースコード分析テストデータファクトリ
 *
 * source-code-analyzer-service と usage-example-validator-service の
 * テストで使用するテストデータを生成する。
 */

import * as Factory from 'factory.ts';
import { createFactoryWrapper } from './base.factory.js';
import type {
  PublicApi,
  RepositoryAnalysis,
  SourceFile,
  ValidationError,
  ValidationResult,
} from '$lib/types/source-analysis.js';

// ──────────────────────────────────────────────────────────────
// SourceFile Factory
// ──────────────────────────────────────────────────────────────

const baseSourceFileFactory = Factory.Sync.makeFactory<SourceFile>({
  path: 'src/index.gs',
  content: `function hello() {\n  return 'Hello, World!';\n}`,
});

// ──────────────────────────────────────────────────────────────
// PublicApi Factory
// ──────────────────────────────────────────────────────────────

const baseFunctionApiFactory = Factory.Sync.makeFactory<PublicApi>({
  type: 'function',
  name: 'testFunction',
  file: 'src/index.gs',
});

const baseClassApiFactory = Factory.Sync.makeFactory<PublicApi>({
  type: 'class',
  name: 'TestClass',
  file: 'src/index.gs',
});

const baseMethodApiFactory = Factory.Sync.makeFactory<PublicApi>({
  type: 'method',
  name: 'TestClass.testMethod',
  file: 'src/index.gs',
});

const baseVariableApiFactory = Factory.Sync.makeFactory<PublicApi>({
  type: 'variable',
  name: 'TEST_CONSTANT',
  file: 'src/index.gs',
});

// ──────────────────────────────────────────────────────────────
// RepositoryAnalysis Factory
// ──────────────────────────────────────────────────────────────

const baseRepositoryAnalysisFactory = Factory.Sync.makeFactory<RepositoryAnalysis>({
  success: true,
  entryPoints: ['src/index.gs'],
  publicApis: [
    { type: 'function', name: 'createService', file: 'src/index.gs' },
    { type: 'class', name: 'OAuth2Service', file: 'src/oauth2.gs' },
    { type: 'method', name: 'OAuth2Service.getAuthUrl', file: 'src/oauth2.gs' },
  ],
  sourceFiles: [
    {
      path: 'src/index.gs',
      content: `function createService() {\n  return new OAuth2Service();\n}`,
    },
    {
      path: 'src/oauth2.gs',
      content: `class OAuth2Service {\n  getAuthUrl() {\n    return 'https://example.com/auth';\n  }\n}`,
    },
  ],
});

const failedRepositoryAnalysisFactory = Factory.Sync.makeFactory<RepositoryAnalysis>({
  success: false,
  error: 'リポジトリツリーを取得できませんでした',
});

const emptyApisRepositoryAnalysisFactory = Factory.Sync.makeFactory<RepositoryAnalysis>({
  success: true,
  entryPoints: [],
  publicApis: [],
  sourceFiles: [],
});

// ──────────────────────────────────────────────────────────────
// ValidationError Factory
// ──────────────────────────────────────────────────────────────

const baseValidationErrorFactory = Factory.Sync.makeFactory<ValidationError>({
  language: 'ja',
  invalidCall: 'unknownMethod',
  type: 'unknown_function',
  message: '関数 "unknownMethod" は公開APIに存在しません',
  suggestions: ['createService'],
});

// ──────────────────────────────────────────────────────────────
// ValidationResult Factory
// ──────────────────────────────────────────────────────────────

const validValidationResultFactory = Factory.Sync.makeFactory<ValidationResult>({
  isValid: true,
  errors: [],
  extractedCalls: {
    ja: ['createService', 'OAuth2Service.getAuthUrl'],
    en: ['createService', 'OAuth2Service.getAuthUrl'],
  },
});

const invalidValidationResultFactory = Factory.Sync.makeFactory<ValidationResult>({
  isValid: false,
  errors: [
    {
      language: 'ja',
      invalidCall: 'unknownMethod',
      type: 'unknown_function',
      message: '関数 "unknownMethod" は公開APIに存在しません',
      suggestions: ['createService'],
    },
    {
      language: 'en',
      invalidCall: 'unknownMethod',
      type: 'unknown_function',
      message: '関数 "unknownMethod" は公開APIに存在しません',
      suggestions: ['createService'],
    },
  ],
  extractedCalls: {
    ja: ['unknownMethod'],
    en: ['unknownMethod'],
  },
});

// ──────────────────────────────────────────────────────────────
// Exports
// ──────────────────────────────────────────────────────────────

export const SourceFileTestDataFactories = {
  default: createFactoryWrapper(baseSourceFileFactory),
  withContent: (content: string) => createFactoryWrapper(baseSourceFileFactory).build({ content }),
  withPath: (path: string) => createFactoryWrapper(baseSourceFileFactory).build({ path }),
} as const;

export const PublicApiTestDataFactories = {
  function: createFactoryWrapper(baseFunctionApiFactory),
  class: createFactoryWrapper(baseClassApiFactory),
  method: createFactoryWrapper(baseMethodApiFactory),
  variable: createFactoryWrapper(baseVariableApiFactory),
  oauth2Example: (): PublicApi[] => [
    { type: 'function', name: 'createService', file: 'src/index.gs' },
    { type: 'class', name: 'OAuth2Service', file: 'src/oauth2.gs' },
    { type: 'method', name: 'OAuth2Service.setTokenUrl', file: 'src/oauth2.gs' },
    { type: 'method', name: 'OAuth2Service.setClientId', file: 'src/oauth2.gs' },
    { type: 'method', name: 'OAuth2Service.getAuthUrl', file: 'src/oauth2.gs' },
    { type: 'method', name: 'OAuth2Service.handleCallback', file: 'src/oauth2.gs' },
  ],
} as const;

export const RepositoryAnalysisTestDataFactories = {
  default: createFactoryWrapper(baseRepositoryAnalysisFactory),
  failed: createFactoryWrapper(failedRepositoryAnalysisFactory),
  emptyApis: createFactoryWrapper(emptyApisRepositoryAnalysisFactory),
  withApis: (publicApis: PublicApi[]) =>
    createFactoryWrapper(baseRepositoryAnalysisFactory).build({ publicApis }),
} as const;

export const ValidationErrorTestDataFactories = {
  default: createFactoryWrapper(baseValidationErrorFactory),
  unknownClass: () =>
    createFactoryWrapper(baseValidationErrorFactory).build({
      invalidCall: 'new UnknownClass',
      type: 'unknown_class',
      message: 'クラス "UnknownClass" は公開APIに存在しません',
    }),
  unknownMethod: () =>
    createFactoryWrapper(baseValidationErrorFactory).build({
      invalidCall: 'service.unknownMethod',
      type: 'unknown_method',
      message: 'メソッド "unknownMethod" は公開APIに存在しません',
    }),
} as const;

export const ValidationResultTestDataFactories = {
  valid: createFactoryWrapper(validValidationResultFactory),
  invalid: createFactoryWrapper(invalidValidationResultFactory),
  withErrors: (errors: ValidationError[]) =>
    createFactoryWrapper(invalidValidationResultFactory).build({ errors, isValid: false }),
} as const;
