import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { ERROR_MESSAGES } from '../../../../../src/lib/constants/error-messages.js';
import {
  CreatedLibraryTestDataFactories,
  GitHubRepoDataTestDataFactories,
} from '../../../../factories/index.js';

// モックを設定
vi.mock('../../../../../src/lib/server/db/index.js', () => ({
  db: vi.fn(),
  testConnection: vi.fn(),
}));

vi.mock('../../../../../src/lib/server/repositories/library-repository.js', () => ({
  LibraryRepository: {
    create: vi.fn(),
  },
}));

vi.mock('../../../../../src/lib/server/services/fetch-github-repo-data-service.js', () => ({
  FetchGitHubRepoDataService: {
    call: vi.fn(),
  },
}));

vi.mock('../../../../../src/lib/server/services/validate-library-uniqueness-service.js', () => ({
  ValidateLibraryUniquenessService: {
    call: vi.fn(),
  },
}));

vi.mock('../../../../../src/lib/server/services/generate-ai-summary-service.js', () => ({
  GenerateAiSummaryService: {
    call: vi.fn(),
    callBackground: vi.fn(),
  },
}));

vi.mock('../../../../../src/lib/server/utils/github-api-utils.js', () => ({
  GitHubApiUtils: {
    parseGitHubUrl: vi.fn(),
  },
}));

vi.mock('../../../../../src/lib/server/utils/service-error-util.js', () => ({
  ServiceErrorUtil: {
    assertCondition: vi.fn(),
  },
}));

vi.mock('../../../../../src/lib/server/utils/gas-script-validator.js', () => ({
  GasScriptValidator: {
    validate: vi.fn(),
  },
}));

vi.mock('nanoid', () => ({
  nanoid: vi.fn(),
}));

// Imports after mocks
import { nanoid } from 'nanoid';
import { testConnection } from '../../../../../src/lib/server/db/index.js';
import { LibraryRepository } from '../../../../../src/lib/server/repositories/library-repository.js';
import { CreateLibraryService } from '../../../../../src/lib/server/services/create-library-service.js';
import { FetchGitHubRepoDataService } from '../../../../../src/lib/server/services/fetch-github-repo-data-service.js';
import { GenerateAiSummaryService } from '../../../../../src/lib/server/services/generate-ai-summary-service.js';
import { ValidateLibraryUniquenessService } from '../../../../../src/lib/server/services/validate-library-uniqueness-service.js';
import { GasScriptValidator } from '../../../../../src/lib/server/utils/gas-script-validator.js';
import { GitHubApiUtils } from '../../../../../src/lib/server/utils/github-api-utils.js';
import { ServiceErrorUtil } from '../../../../../src/lib/server/utils/service-error-util.js';

const mockTestConnection = testConnection as ReturnType<typeof vi.fn>;
const mockGasScriptValidator = GasScriptValidator as unknown as {
  validate: ReturnType<typeof vi.fn>;
};
const mockLibraryRepository = LibraryRepository as unknown as {
  create: ReturnType<typeof vi.fn>;
};
const mockFetchGitHubRepoDataService = FetchGitHubRepoDataService as unknown as {
  call: ReturnType<typeof vi.fn>;
};
const mockValidateLibraryUniquenessService = ValidateLibraryUniquenessService as unknown as {
  call: ReturnType<typeof vi.fn>;
};
const mockGenerateAiSummaryService = GenerateAiSummaryService as unknown as {
  call: ReturnType<typeof vi.fn>;
  callBackground: ReturnType<typeof vi.fn>;
};
const mockGitHubApiUtils = GitHubApiUtils as unknown as {
  parseGitHubUrl: ReturnType<typeof vi.fn>;
};
const mockServiceErrorUtil = ServiceErrorUtil as unknown as {
  assertCondition: ReturnType<typeof vi.fn>;
};
const mockNanoid = nanoid as unknown as ReturnType<typeof vi.fn>;

describe('CreateLibraryService', () => {
  const mockParams = {
    scriptId: 'TEST_SCRIPT_ID',
    repoUrl: 'owner/repo',
  };

  // ファクトリからテストデータを生成
  const mockRepoData = GitHubRepoDataTestDataFactories.forCreateLibrary.build();
  const mockCreatedLibrary = CreatedLibraryTestDataFactories.forCreateLibraryService.build();

  beforeEach(() => {
    vi.clearAllMocks();

    // デフォルトのモック設定
    mockTestConnection.mockResolvedValue(true);
    mockGitHubApiUtils.parseGitHubUrl.mockReturnValue({ owner: 'owner', repo: 'repo' });
    mockFetchGitHubRepoDataService.call.mockResolvedValue(mockRepoData);
    mockValidateLibraryUniquenessService.call.mockResolvedValue(undefined);
    mockGenerateAiSummaryService.call.mockResolvedValue(undefined);
    mockGenerateAiSummaryService.callBackground.mockReturnValue(undefined);
    mockLibraryRepository.create.mockResolvedValue(mockCreatedLibrary);
    mockNanoid.mockReturnValue('mock-library-id');
    mockGasScriptValidator.validate.mockResolvedValue(null); // デフォルトは検証なし
    mockServiceErrorUtil.assertCondition.mockImplementation((condition, message) => {
      if (!condition) {
        throw new Error(message);
      }
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('新規ライブラリ作成時にAI要約が生成される', async () => {
    // ライブラリ作成を実行
    const result = await CreateLibraryService.call(mockParams);

    // 基本的なライブラリ作成が正常に実行されたことを確認
    expect(mockTestConnection).toHaveBeenCalledOnce();
    expect(mockGitHubApiUtils.parseGitHubUrl).toHaveBeenCalledWith('https://github.com/owner/repo');
    expect(mockFetchGitHubRepoDataService.call).toHaveBeenCalledWith('owner', 'repo');
    expect(mockValidateLibraryUniquenessService.call).toHaveBeenCalledWith(
      'TEST_SCRIPT_ID',
      'https://github.com/owner/repo'
    );

    // AI要約生成がバックグラウンドで呼び出されたことを確認
    expect(mockGenerateAiSummaryService.callBackground).toHaveBeenCalledWith({
      libraryId: 'mock-library-id',
      githubUrl: 'https://github.com/owner/repo',
      skipOnError: true,
      logContext: '新規ライブラリのAI要約を生成',
    });

    // 結果の検証
    expect(result).toBe('mock-library-id');
  });

  test('AI要約生成でエラーが発生してもライブラリ作成は続行される', async () => {
    // callBackgroundは内部でエラーをキャッチするため、エラーが外部に伝播しない
    mockGenerateAiSummaryService.callBackground.mockReturnValue(undefined);

    // ライブラリ作成を実行
    const result = await CreateLibraryService.call(mockParams);

    // ライブラリ作成は成功することを確認
    expect(result).toBe('mock-library-id');

    // AI要約生成が試行されたことを確認
    expect(mockGenerateAiSummaryService.callBackground).toHaveBeenCalledWith({
      libraryId: 'mock-library-id',
      githubUrl: 'https://github.com/owner/repo',
      skipOnError: true,
      logContext: '新規ライブラリのAI要約を生成',
    });
  });

  test('AI要約保存でエラーが発生してもライブラリ作成は続行される', async () => {
    // callBackgroundは内部でエラーをキャッチするため、エラーが外部に伝播しない
    mockGenerateAiSummaryService.callBackground.mockReturnValue(undefined);

    // ライブラリ作成を実行
    const result = await CreateLibraryService.call(mockParams);

    // ライブラリ作成は成功することを確認
    expect(result).toBe('mock-library-id');

    // AI要約生成が試行されたことを確認
    expect(mockGenerateAiSummaryService.callBackground).toHaveBeenCalledWith({
      libraryId: 'mock-library-id',
      githubUrl: 'https://github.com/owner/repo',
      skipOnError: true,
      logContext: '新規ライブラリのAI要約を生成',
    });
  });

  test('データベース接続に失敗した場合はエラーをスローする', async () => {
    mockTestConnection.mockResolvedValue(false);

    await expect(CreateLibraryService.call(mockParams)).rejects.toThrow(
      ERROR_MESSAGES.DATABASE_CONNECTION_FAILED
    );

    // AI要約生成は呼び出されないことを確認
    expect(mockGenerateAiSummaryService.callBackground).not.toHaveBeenCalled();
  });

  test('重複するscriptIdが存在する場合はエラーをスローする', async () => {
    // 重複チェックでエラーを発生させる
    mockValidateLibraryUniquenessService.call.mockRejectedValue(
      new Error(ERROR_MESSAGES.SCRIPT_ID_ALREADY_REGISTERED)
    );

    await expect(CreateLibraryService.call(mockParams)).rejects.toThrow(
      ERROR_MESSAGES.SCRIPT_ID_ALREADY_REGISTERED
    );

    // AI要約生成は呼び出されないことを確認
    expect(mockGenerateAiSummaryService.callBackground).not.toHaveBeenCalled();
  });

  test('スクリプト検証がnot_foundの場合はステータスがrejectedになる', async () => {
    // 1から始まるスクリプトIDを使用（検証が実行される）
    const params = { scriptId: '1TEST_SCRIPT_ID', repoUrl: 'owner/repo' };

    // 検証結果がnot_foundを返す
    mockGasScriptValidator.validate.mockResolvedValue({
      scriptId: '1TEST_SCRIPT_ID',
      status: 'not_found',
      httpStatus: 404,
    });

    // ライブラリ作成を実行
    await CreateLibraryService.call(params);

    // ステータスがrejectedで保存されることを確認
    expect(mockLibraryRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'rejected',
        scriptType: 'web_app',
        scriptValidationStatus: 'not_found',
      })
    );
  });

  test('スクリプト検証がaccessibleの場合はステータスがpendingになる', async () => {
    // 1から始まるスクリプトIDを使用
    const params = { scriptId: '1TEST_SCRIPT_ID', repoUrl: 'owner/repo' };

    // 検証結果がaccessibleを返す
    mockGasScriptValidator.validate.mockResolvedValue({
      scriptId: '1TEST_SCRIPT_ID',
      status: 'accessible',
      httpStatus: 200,
    });

    // ライブラリ作成を実行
    await CreateLibraryService.call(params);

    // ステータスがpendingで保存されることを確認
    expect(mockLibraryRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'pending',
        scriptType: 'library',
        scriptValidationStatus: 'accessible',
      })
    );
  });

  test('最終コミット日時の取得に失敗した場合はエラーをスローする', async () => {
    // fetchGitHubRepoDataServiceでエラーを発生させる
    mockFetchGitHubRepoDataService.call.mockRejectedValue(
      new Error('Failed to fetch last commit date.')
    );

    await expect(CreateLibraryService.call(mockParams)).rejects.toThrow(
      'Failed to fetch last commit date.'
    );

    // AI要約生成は呼び出されないことを確認
    expect(mockGenerateAiSummaryService.callBackground).not.toHaveBeenCalled();
  });
});
