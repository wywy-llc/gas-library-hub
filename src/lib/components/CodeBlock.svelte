<script lang="ts">
  import hljs from 'highlight.js/lib/core';
  import javascript from 'highlight.js/lib/languages/javascript';
  import 'highlight.js/styles/github.css';

  /**
   * シンタックスハイライト付きコードブロックコンポーネント
   * Google Apps Script（JavaScript）のコードをハイライト表示
   *
   * 使用例:
   * <CodeBlock code={codeString} />
   * <CodeBlock code={codeString} language="javascript" />
   */

  interface Props {
    code: string;
    language?: string;
    class?: string;
  }

  let { code, language = 'javascript', class: className = '' }: Props = $props();

  // highlight.jsの言語を登録
  hljs.registerLanguage('javascript', javascript);

  // ハイライト済みのHTML
  let highlightedCode = $derived(() => {
    if (!code) return '';

    try {
      const lang = hljs.getLanguage(language) ? language : 'javascript';
      return hljs.highlight(code, { language: lang }).value;
    } catch (error) {
      console.warn('CodeBlock highlight error:', error);
      return code;
    }
  });
</script>

<div class="overflow-x-auto rounded-lg {className}">
  <pre class="m-0 rounded-lg bg-[#f6f8fa] p-4"><code
      class="hljs language-{language} !bg-transparent !p-0 text-sm leading-relaxed"
      >{@html highlightedCode()}</code
    ></pre>
</div>
