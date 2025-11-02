<script module>
  import LibraryCard from '$lib/components/LibraryCard.svelte';
  import { defineMeta } from '@storybook/addon-svelte-csf';

  // ライブラリカードコンポーネントのStorybook設定
  // 異なるライブラリ情報のバリエーションを表示し、動作を検証
  const { Story } = defineMeta({
    title: 'AppsScriptHub/LibraryCard',
    component: LibraryCard,
    tags: ['autodocs'],
    argTypes: {
      library: {
        control: 'object',
        description: 'ライブラリ情報オブジェクト',
      },
    },
    parameters: {
      docs: {
        description: {
          component:
            'GASライブラリの情報を表示するカードコンポーネント。検索結果やライブラリ一覧ページで使用されます。',
        },
      },
    },
  });

  // テスト用のライブラリデータ
  const mockLibrary = {
    id: '1',
    name: 'GasDateFormatter',
    scriptId: 'script123',
    repositoryUrl: 'https://github.com/user/gas-date-formatter',
    authorUrl: 'https://github.com/user-name',
    authorName: 'user-name',
    description:
      'Moment.jsライクなシンタックスで、GASの日時オブジェクトを簡単にフォーマットするためのユーティリティライブラリ。タイムゾーンの扱いもサポート。',
    readmeContent: '',
    licenseType: 'MIT',
    licenseUrl: '',
    starCount: 42,
    copyCount: 15,
    lastCommitAt: new Date('2024-01-01'),
    status: 'published',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockLibrarySummary = {
    id: '1',
    libraryId: '1',
    libraryNameJa: 'GAS日付フォーマッター',
    libraryNameEn: 'GasDateFormatter',
    purposeJa: 'GASで日時オブジェクトを簡単にフォーマットするためのライブラリ',
    purposeEn: 'A library for easily formatting date objects in GAS',
    targetUsersJa: 'GAS開発者、日付処理を頻繁に行う開発者',
    targetUsersEn: 'GAS developers, developers who frequently handle dates',
    tagsJa: ['日付', 'ユーティリティ', 'フォーマット'],
    tagsEn: ['Date', 'Utility', 'Format'],
    coreProblemJa: 'GASでの日付フォーマットが複雑で手間がかかる',
    coreProblemEn: 'Date formatting in GAS is complex and time-consuming',
    mainBenefits: [
      {
        title: { ja: 'シンプルな書式指定', en: 'Simple format specification' },
        description: { ja: 'Moment.jsライクな直感的な記法', en: 'Intuitive Moment.js-like syntax' },
      },
      {
        title: { ja: 'タイムゾーン対応', en: 'Timezone support' },
        description: { ja: '複数のタイムゾーンに対応', en: 'Supports multiple timezones' },
      },
    ],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const longDescriptionLibrary = {
    id: 2,
    name: 'SuperLongLibraryNameThatMightWrapToMultipleLines',
    description:
      'このライブラリは非常に長い説明文を持っています。この説明文は複数行にわたって表示される可能性があり、カードレイアウトがどのように対応するかをテストするために使用されます。さらに長い文章を追加して、レイアウトの動作を確認します。',
    tags: ['Test', 'LongText', 'Layout', 'UI', 'Responsive'],
    author: 'very-long-username-for-testing',
    version: 'v10.25.100',
    lastUpdated: '1年前',
  };

  const minimalLibrary = {
    id: 3,
    name: 'SimpleLib',
    description: 'シンプルなライブラリ',
    tags: ['Simple'],
    author: 'dev',
    version: 'v1.0.0',
    lastUpdated: '今日',
  };
</script>

<!-- デフォルトのライブラリカード -->
<Story
  name="Default"
  args={{
    library: mockLibrary,
    librarySummary: mockLibrarySummary,
  }}
/>

<!-- 長い説明文とライブラリ名のテスト -->
<Story
  name="LongContent"
  args={{
    library: longDescriptionLibrary,
  }}
/>

<!-- 最小限の情報を持つライブラリカード -->
<Story
  name="Minimal"
  args={{
    library: minimalLibrary,
  }}
/>

<!-- ホバー効果のテスト -->
<Story
  name="Interactive"
  args={{
    library: mockLibrary,
  }}
/>

<!-- 異なるタグ組み合わせのテスト -->
<Story
  name="VariousTags"
  args={{
    library: {
      id: 4,
      name: 'CalendarEventUtil',
      description: 'Googleカレンダーのイベント作成・更新・削除をより直感的に行えるヘルパー集。',
      tags: ['Calendar', 'Date', 'Japan', 'Holiday'],
      author: 'calendar-master',
      version: 'v2.1.0',
      lastUpdated: '1週間前',
    },
  }}
/>
