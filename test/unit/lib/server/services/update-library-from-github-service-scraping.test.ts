import { beforeEach, describe, expect, test, vi } from 'vitest';

// モック設定
vi.mock('../../../../../src/lib/server/db/index.js', () => ({
  db: {
    update: vi.fn(),
  },
}));

vi.mock('../../../../../src/lib/server/repositories/library-repository.js', () => ({
  LibraryRepository: {
    findById: vi.fn(),
  },
}));

vi.mock('../../../../../src/lib/server/repositories/library-summary-repository.js', () => ({
  LibrarySummaryRepository: {
    exists: vi.fn(),
  },
}));

vi.mock('../../../../../src/lib/server/services/fetch-github-repo-data-service.js', () => ({
  FetchGitHubRepoDataService: {
    call: vi.fn(),
  },
}));

vi.mock('../../../../../src/lib/server/services/generate-ai-summary-service.js', () => ({
  GenerateAiSummaryService: {
    call: vi.fn(),
  },
}));

vi.mock('../../../../../src/lib/server/services/scrape-gas-library-service.js', () => ({
  ScrapeGASLibraryService: {
    call: vi.fn(),
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

// import文
import { db } from '../../../../../src/lib/server/db/index.js';
import { LibraryRepository } from '../../../../../src/lib/server/repositories/library-repository.js';
import { LibrarySummaryRepository } from '../../../../../src/lib/server/repositories/library-summary-repository.js';
import { FetchGitHubRepoDataService } from '../../../../../src/lib/server/services/fetch-github-repo-data-service.js';
import { ScrapeGASLibraryService } from '../../../../../src/lib/server/services/scrape-gas-library-service.js';
import { UpdateLibraryFromGithubService } from '../../../../../src/lib/server/services/update-library-from-github-service.js';
import { GitHubApiUtils } from '../../../../../src/lib/server/utils/github-api-utils.js';
import { ServiceErrorUtil } from '../../../../../src/lib/server/utils/service-error-util.js';

// モックされたインスタンスを取得
const mockDb = db as unknown as {
  update: ReturnType<typeof vi.fn>;
};
const mockLibraryRepository = LibraryRepository as unknown as {
  findById: ReturnType<typeof vi.fn>;
};
const mockLibrarySummaryRepository = LibrarySummaryRepository as unknown as {
  exists: ReturnType<typeof vi.fn>;
};
const mockFetchGitHubRepoDataService = FetchGitHubRepoDataService as unknown as {
  call: ReturnType<typeof vi.fn>;
};
const mockScrapeGASLibraryService = ScrapeGASLibraryService as unknown as {
  call: ReturnType<typeof vi.fn>;
};
const mockGitHubApiUtils = GitHubApiUtils as unknown as {
  parseGitHubUrl: ReturnType<typeof vi.fn>;
};
const mockServiceErrorUtil = ServiceErrorUtil as unknown as {
  assertCondition: ReturnType<typeof vi.fn>;
};

describe('UpdateLibraryFromGithubService - スクレイピング機能', () => {
  const libraryId = 'test_lib_123';
  const lastCommitAt = new Date('2024-01-10T10:00:00Z');

  let mockUpdateChain: {
    set: ReturnType<typeof vi.fn>;
  };

  const mockLibraryData = {
    id: libraryId,
    repositoryUrl: 'https://github.com/test/repo',
    lastCommitAt: lastCommitAt,
    scriptId: '1OldScriptId123',
    scriptType: 'library' as const,
  };

  const mockRepoData = {
    repoInfo: {
      name: 'test-repo',
      description: 'Test repository',
      repositoryUrl: 'https://github.com/test/repo',
      authorName: 'test-owner',
      authorUrl: 'https://github.com/test-owner',
      starCount: 10,
    },
    licenseInfo: {
      type: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
    lastCommitAt: lastCommitAt,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // 基本的なモック設定
    mockUpdateChain = {
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    };

    mockDb.update.mockReturnValue(mockUpdateChain);
    mockLibraryRepository.findById.mockResolvedValue(mockLibraryData);
    mockLibrarySummaryRepository.exists.mockResolvedValue(true);
    mockFetchGitHubRepoDataService.call.mockResolvedValue(mockRepoData);
    mockGitHubApiUtils.parseGitHubUrl.mockReturnValue({
      owner: 'test',
      repo: 'repo',
    });
    mockServiceErrorUtil.assertCondition.mockImplementation(() => {});
  });

  test('スクレイピング成功時にスクリプトIDが更新される', async () => {
    // Arrange
    const newScriptId = '1NewScriptId456';
    const newScriptType = 'web_app' as const;

    mockScrapeGASLibraryService.call.mockResolvedValue({
      success: true,
      data: {
        scriptId: newScriptId,
        scriptType: newScriptType,
        name: 'test-repo',
        repositoryUrl: 'https://github.com/test/repo',
        authorUrl: 'https://github.com/test-owner',
        authorName: 'test-owner',
        description: 'Test repository',
        starCount: 10,
        lastCommitAt: lastCommitAt,
        status: 'pending' as const,
      },
    });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    // Act
    await UpdateLibraryFromGithubService.call(libraryId, { skipAiSummary: true });

    // Assert
    expect(mockScrapeGASLibraryService.call).toHaveBeenCalledWith(mockLibraryData.repositoryUrl);
    expect(consoleSpy).toHaveBeenCalledWith(
      `スクリプトID更新: ${mockLibraryData.scriptId} → ${newScriptId}`
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      `スクリプトタイプ更新: ${mockLibraryData.scriptType} → ${newScriptType}`
    );

    expect(mockDb.update).toHaveBeenCalledWith(expect.any(Object));
    expect(mockUpdateChain.set).toHaveBeenCalledWith(
      expect.objectContaining({
        scriptId: newScriptId,
        scriptType: newScriptType,
      })
    );

    consoleSpy.mockRestore();
  });

  test('スクレイピング成功時にスクリプトIDが変更されない場合はログ出力されない', async () => {
    // Arrange
    mockScrapeGASLibraryService.call.mockResolvedValue({
      success: true,
      data: {
        scriptId: mockLibraryData.scriptId, // 同じID
        scriptType: mockLibraryData.scriptType, // 同じタイプ
        name: 'test-repo',
        repositoryUrl: 'https://github.com/test/repo',
        authorUrl: 'https://github.com/test-owner',
        authorName: 'test-owner',
        description: 'Test repository',
        starCount: 10,
        lastCommitAt: lastCommitAt,
        status: 'pending' as const,
      },
    });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    // Act
    await UpdateLibraryFromGithubService.call(libraryId, { skipAiSummary: true });

    // Assert
    expect(mockScrapeGASLibraryService.call).toHaveBeenCalledWith(mockLibraryData.repositoryUrl);
    expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('スクリプトID更新:'));
    expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('スクリプトタイプ更新:'));

    expect(mockDb.update).toHaveBeenCalledWith(expect.any(Object));
    expect(mockUpdateChain.set).toHaveBeenCalledWith(
      expect.objectContaining({
        scriptId: mockLibraryData.scriptId,
        scriptType: mockLibraryData.scriptType,
      })
    );

    consoleSpy.mockRestore();
  });

  test('スクレイピング失敗時は既存の値を保持する', async () => {
    // Arrange
    mockScrapeGASLibraryService.call.mockRejectedValue(new Error('スクレイピングに失敗しました'));

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Act
    await UpdateLibraryFromGithubService.call(libraryId, { skipAiSummary: true });

    // Assert
    expect(mockScrapeGASLibraryService.call).toHaveBeenCalledWith(mockLibraryData.repositoryUrl);
    expect(consoleSpy).toHaveBeenCalledWith(
      'スクレイピング失敗: Error: スクレイピングに失敗しました - 既存の値を保持します'
    );

    expect(mockDb.update).toHaveBeenCalledWith(expect.any(Object));
    expect(mockUpdateChain.set).toHaveBeenCalledWith(
      expect.objectContaining({
        scriptId: mockLibraryData.scriptId, // 既存の値を保持
        scriptType: mockLibraryData.scriptType, // 既存の値を保持
      })
    );

    consoleSpy.mockRestore();
  });

  test('スクレイピングでエラーが発生した場合は既存の値を保持する', async () => {
    // Arrange
    mockScrapeGASLibraryService.call.mockRejectedValue(new Error('ネットワークエラー'));

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Act
    await UpdateLibraryFromGithubService.call(libraryId, { skipAiSummary: true });

    // Assert
    expect(mockScrapeGASLibraryService.call).toHaveBeenCalledWith(mockLibraryData.repositoryUrl);
    expect(consoleSpy).toHaveBeenCalledWith(
      'スクレイピング失敗: Error: ネットワークエラー - 既存の値を保持します'
    );

    expect(mockDb.update).toHaveBeenCalledWith(expect.any(Object));
    expect(mockUpdateChain.set).toHaveBeenCalledWith(
      expect.objectContaining({
        scriptId: mockLibraryData.scriptId, // 既存の値を保持
        scriptType: mockLibraryData.scriptType, // 既存の値を保持
      })
    );

    consoleSpy.mockRestore();
  });
});
