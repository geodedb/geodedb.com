/**
 * Code Block Enhancements
 * - Add copy buttons to code blocks
 * - Add language labels
 * - GQL syntax highlighting support
 */

(function () {
  'use strict';

  // Add copy button to all code blocks
  function addCopyButtons() {
    const codeBlocks = document.querySelectorAll('pre code');

    codeBlocks.forEach((codeBlock) => {
      const pre = codeBlock.parentElement;
      if (!pre || pre.querySelector('.copy-button')) return; // Skip if already has button

      // Get language from class (e.g., "language-gql")
      const lang = [...codeBlock.classList]
        .find((cls) => cls.startsWith('language-'))
        ?.replace('language-', '')
        || 'code';

      // Wrap in code-block-wrapper if not already wrapped
      let wrapper = pre.parentElement;
      if (!wrapper.classList.contains('code-block-wrapper')) {
        wrapper = document.createElement('div');
        wrapper.className = 'code-block-wrapper';
        pre.parentNode.insertBefore(wrapper, pre);
        wrapper.appendChild(pre);
      }

      // Add language label to pre
      pre.setAttribute('data-lang', lang.toUpperCase());

      // Create copy button
      const button = document.createElement('button');
      button.className = 'copy-button';
      button.setAttribute('aria-label', 'Copy code to clipboard');
      button.innerHTML = `
        <wa-icon name="copy" aria-hidden="true"></wa-icon>
        <span>Copy</span>
      `;

      // Add click handler
      button.addEventListener('click', async function () {
        const code = codeBlock.textContent;

        try {
          await navigator.clipboard.writeText(code);

          // Show success state
          button.classList.add('copied');
          button.innerHTML = `
            <wa-icon name="check" aria-hidden="true"></wa-icon>
            <span>Copied!</span>
          `;

          // Reset after 2 seconds
          setTimeout(() => {
            button.classList.remove('copied');
            button.innerHTML = `
              <wa-icon name="copy" aria-hidden="true"></wa-icon>
              <span>Copy</span>
            `;
          }, 2000);
        } catch (err) {
          console.error('Failed to copy code:', err);

          // Fallback for older browsers
          const textArea = document.createElement('textarea');
          textArea.value = code;
          textArea.style.position = 'fixed';
          textArea.style.left = '-999999px';
          document.body.appendChild(textArea);
          textArea.select();

          try {
            document.execCommand('copy');
            button.classList.add('copied');
            button.innerHTML = `
              <wa-icon name="check" aria-hidden="true"></wa-icon>
              <span>Copied!</span>
            `;

            setTimeout(() => {
              button.classList.remove('copied');
              button.innerHTML = `
                <wa-icon name="copy" aria-hidden="true"></wa-icon>
                <span>Copy</span>
              `;
            }, 2000);
          } catch (fallbackErr) {
            console.error('Fallback copy failed:', fallbackErr);
          }

          document.body.removeChild(textArea);
        }
      });

      // Add button to wrapper
      wrapper.insertBefore(button, pre);
    });
  }

  // Add GQL syntax highlighting (basic)
  function addGQLHighlighting() {
    const gqlBlocks = document.querySelectorAll('code.language-gql, code.language-graphql');

    gqlBlocks.forEach((block) => {
      if (block.classList.contains('gql-highlighted')) return;

      let code = block.textContent;

      // GQL Keywords
      const keywords = [
        'MATCH', 'CREATE', 'MERGE', 'DELETE', 'REMOVE', 'SET', 'RETURN',
        'WHERE', 'WITH', 'OPTIONAL', 'UNWIND', 'UNION', 'CALL', 'YIELD',
        'ORDER', 'BY', 'SKIP', 'LIMIT', 'ASC', 'DESC', 'DISTINCT',
        'ON', 'CREATE', 'DROP', 'INDEX', 'CONSTRAINT', 'UNIQUE', 'EXISTS',
        'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'AND', 'OR', 'NOT', 'XOR',
        'IN', 'STARTS', 'ENDS', 'CONTAINS', 'IS', 'NULL', 'AS',
        'TRUE', 'FALSE', 'COUNT', 'SUM', 'AVG', 'MIN', 'MAX',
        'COLLECT', 'EXTRACT', 'FILTER', 'REDUCE', 'ALL', 'ANY', 'NONE', 'SINGLE'
      ];

      // Escape HTML
      code = code
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

      // Highlight keywords (case-insensitive)
      keywords.forEach((keyword) => {
        const regex = new RegExp(`\\b(${keyword})\\b`, 'gi');
        code = code.replace(regex, '<span class="keyword">$1</span>');
      });

      // Highlight strings
      code = code.replace(/(['"`])(.*?)\1/g, '<span class="string">$1$2$1</span>');

      // Highlight numbers
      code = code.replace(/\b(\d+)\b/g, '<span class="number">$1</span>');

      // Highlight comments (// and /* */)
      code = code.replace(/\/\/(.*?)$/gm, '<span class="comment">//$1</span>');
      code = code.replace(/\/\*([\s\S]*?)\*\//g, '<span class="comment">/*$1*/</span>');

      // Highlight variables (starting with $)
      code = code.replace(/(\$\w+)/g, '<span class="variable">$1</span>');

      // Highlight node labels (:Label)
      code = code.replace(/:(\w+)/g, ':<span class="class-name">$1</span>');

      // Highlight relationship types [-[:TYPE]->]
      code = code.replace(/\[:(\w+)\]/g, '[:<span class="type">$1</span>]');

      block.innerHTML = code;
      block.classList.add('gql-highlighted');
    });
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      addCopyButtons();
      addGQLHighlighting();
    });
  } else {
    addCopyButtons();
    addGQLHighlighting();
  }

  // Re-run on dynamic content changes (if needed)
  if (typeof MutationObserver !== 'undefined') {
    const observer = new MutationObserver(function (mutations) {
      let shouldUpdate = false;
      mutations.forEach(function (mutation) {
        if (mutation.addedNodes.length > 0) {
          mutation.addedNodes.forEach(function (node) {
            if (node.nodeType === 1 && (node.tagName === 'PRE' || node.querySelector('pre'))) {
              shouldUpdate = true;
            }
          });
        }
      });

      if (shouldUpdate) {
        addCopyButtons();
        addGQLHighlighting();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
})();
