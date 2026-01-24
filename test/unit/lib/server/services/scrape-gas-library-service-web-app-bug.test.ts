import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ScrapeGASLibraryService } from '../../../../../src/lib/server/services/scrape-gas-library-service.js';
import { GitHubApiUtils } from '../../../../../src/lib/server/utils/github-api-utils.js';

// GitHubApiUtilsをモック化
vi.mock('../../../../../src/lib/server/utils/github-api-utils.js', () => ({
  GitHubApiUtils: {
    parseGitHubUrl: vi.fn(),
    fetchRepositoryInfo: vi.fn(),
    fetchReadme: vi.fn(),
    fetchLastCommitDate: vi.fn(),
  },
}));

describe('ScrapeGASLibraryService - Web App Classification Bug Fix', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should classify Schedules App with WebApp URLs as web_app (no script ID in README)', async () => {
    const readmeContent = `# Schedules App
**Project currently stalled due to other projects.**

Create and view schedules in a web app. 

Report any bugs you find and tell me what you want to see on the [issues](https://github.com/UplandJacob2/Schedules-App/issues) page

** **

### The app is available at:

https://script.google.com/a/macros/stu.evsck12.com/s/AKfycbzw5nZW2BHmdvVJk0Ru3iRNBVS1Ku9K-NDX5Ncf2gkxyy0OF2ethzaeVwETLMZhrIVl2A/exec

The newest code here is not available at this link. Only the latest stable(ish) release is public.

All data is stored in my Google Drive. The code is run in Google Apps Script.

**Note: I can see any data in your schedules, your email, and password.**

### Testing deployment: 

https://script.google.com/macros/s/AKfycby2WEDnie17ngh3Ra4n-2wvR5u-xnot76eaVXjc97mcw2xjNiQ8Ch9hWHcGTVRD8z1ykw/exec

Bugs are bound to be plentiful, so report them.

** **

### Developing on it yourself

> project is under the [MIT License](https://github.com/UplandJacob2/Schedules-App/blob/main/LICENSE)

Create a Google Apps Script project and copy the files from the \`src\` folder.

> You will also need to create folders in your Google Drive and change the folder IDs in the code yours.

**Feel free to make pull requests.**`;

    // GitHubApiUtilsのモック設定
    vi.mocked(GitHubApiUtils.parseGitHubUrl).mockReturnValue({
      owner: 'UplandJacob2',
      repo: 'Schedules-App',
    });

    vi.mocked(GitHubApiUtils.fetchRepositoryInfo).mockResolvedValue({
      name: 'Schedules-App',
      description: 'Create and view schedules in a web app',
      stargazers_count: 5,
      html_url: 'https://github.com/UplandJacob2/Schedules-App',
      clone_url: 'https://github.com/UplandJacob2/Schedules-App.git',
      owner: {
        login: 'UplandJacob2',
        html_url: 'https://github.com/UplandJacob2',
      },
      license: {
        name: 'MIT License',
        url: 'https://api.github.com/licenses/mit',
      },
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    });

    vi.mocked(GitHubApiUtils.fetchReadme).mockResolvedValue(readmeContent);
    vi.mocked(GitHubApiUtils.fetchLastCommitDate).mockResolvedValue(new Date('2024-01-01'));

    const result = await ScrapeGASLibraryService.call(
      'https://github.com/UplandJacob2/Schedules-App'
    );

    expect(result.success).toBe(true);
    if (result.success && result.data) {
      // WebアプリURLのみが検出されているため、web_appに分類されるべき
      expect(result.data.scriptType).toBe('web_app');
      // 最初に見つかったWebアプリURLのスクリプトIDが使用されるべき
      expect(result.data.scriptId).toBe(
        'AKfycbzw5nZW2BHmdvVJk0Ru3iRNBVS1Ku9K-NDX5Ncf2gkxyy0OF2ethzaeVwETLMZhrIVl2A'
      );
    }
  });

  it('should classify project with both WebApp URL and script ID as library', async () => {
    const readmeContent = `# Mixed Project

This project has both library script ID and web app.

## Library Usage
Script ID: 1MbQ56Ik4-I_4rnVlr9lTxJoXHStkjHYDyMHjmDWiRiJR3MDl-ThHwnbg

## Web App
Available at: https://script.google.com/macros/s/AKfycby2WEDnie17ngh3Ra4n-2wvR5u-xnot76eaVXjc97mcw2xjNiQ8Ch9hWHcGTVRD8z1ykw/exec
`;

    // GitHubApiUtilsのモック設定
    vi.mocked(GitHubApiUtils.parseGitHubUrl).mockReturnValue({
      owner: 'example',
      repo: 'mixed-project',
    });

    vi.mocked(GitHubApiUtils.fetchRepositoryInfo).mockResolvedValue({
      name: 'mixed-project',
      description: 'A project with both library and web app',
      stargazers_count: 15,
      html_url: 'https://github.com/example/mixed-project',
      clone_url: 'https://github.com/example/mixed-project.git',
      owner: {
        login: 'example',
        html_url: 'https://github.com/example',
      },
      license: {
        name: 'MIT License',
        url: 'https://api.github.com/licenses/mit',
      },
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    });

    vi.mocked(GitHubApiUtils.fetchReadme).mockResolvedValue(readmeContent);
    vi.mocked(GitHubApiUtils.fetchLastCommitDate).mockResolvedValue(new Date('2024-01-01'));

    const result = await ScrapeGASLibraryService.call('https://github.com/example/mixed-project');

    expect(result.success).toBe(true);
    if (result.success && result.data) {
      // WebアプリURLとスクリプトIDの両方があるため、libraryに分類されるべき
      expect(result.data.scriptType).toBe('library');
      // 通常のスクリプトIDが使用されるべき（WebアプリURLのIDではない）
      expect(result.data.scriptId).toBe(
        '1MbQ56Ik4-I_4rnVlr9lTxJoXHStkjHYDyMHjmDWiRiJR3MDl-ThHwnbg'
      );
    }
  });

  it('should classify project with 1-starting script ID in library documentation as library', async () => {
    const readmeContent = `# GAS Library Example

This is a library for Google Apps Script.

## Installation

Add this library to your project with script ID: 1MbQ56Ik4-I_4rnVlr9lTxJoXHStkjHYDyMHjmDWiRiJR3MDl-ThHwnbg

## Usage

\`\`\`javascript
const lib = LibraryName.doSomething();
\`\`\``;

    // GitHubApiUtilsのモック設定
    vi.mocked(GitHubApiUtils.parseGitHubUrl).mockReturnValue({
      owner: 'example',
      repo: 'gas-library',
    });

    vi.mocked(GitHubApiUtils.fetchRepositoryInfo).mockResolvedValue({
      name: 'gas-library',
      description: 'A GAS library',
      stargazers_count: 10,
      html_url: 'https://github.com/example/gas-library',
      clone_url: 'https://github.com/example/gas-library.git',
      owner: {
        login: 'example',
        html_url: 'https://github.com/example',
      },
      license: {
        name: 'MIT License',
        url: 'https://api.github.com/licenses/mit',
      },
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    });

    vi.mocked(GitHubApiUtils.fetchReadme).mockResolvedValue(readmeContent);
    vi.mocked(GitHubApiUtils.fetchLastCommitDate).mockResolvedValue(new Date('2024-01-01'));

    const result = await ScrapeGASLibraryService.call('https://github.com/example/gas-library');

    expect(result.success).toBe(true);
    if (result.success && result.data) {
      // 1から始まるスクリプトIDで、WebアプリURLがないため、libraryに分類されるべき
      expect(result.data.scriptType).toBe('library');
      expect(result.data.scriptId).toBe(
        '1MbQ56Ik4-I_4rnVlr9lTxJoXHStkjHYDyMHjmDWiRiJR3MDl-ThHwnbg'
      );
    }
  });
});
