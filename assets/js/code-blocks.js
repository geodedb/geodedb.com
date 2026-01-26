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
      const pre = codeBlock.closest('pre');
      if (!pre) return;

      // Get language from class (e.g., "language-gql")
      const lang = [...codeBlock.classList]
        .find((cls) => cls.startsWith('language-'))
        ?.replace('language-', '')
        || 'code';

      // Wrap the full highlight block if present
      const wrapperTarget = pre.closest('.highlight') || pre;
      let wrapper = wrapperTarget.parentElement;

      if (!wrapper || !wrapper.classList.contains('code-block-wrapper')) {
        wrapper = document.createElement('div');
        wrapper.className = 'code-block-wrapper';
        wrapperTarget.parentNode.insertBefore(wrapper, wrapperTarget);
        wrapper.appendChild(wrapperTarget);
      }

      // Add language label to wrapper for CSS
      wrapper.dataset.lang = lang.toUpperCase();

      if (wrapper.querySelector('.copy-button')) return;

      // Create copy button
      const button = document.createElement('button');
      button.className = 'copy-button';
      button.setAttribute('aria-label', 'Copy code to clipboard');
      button.type = 'button';
      button.innerHTML = `
        <wa-icon name="copy" aria-hidden="true"></wa-icon>
        <span>Copy</span>
      `;

      // Add click handler
      button.addEventListener('click', async function () {
        let code = '';
        
        // Find the actual code element (robust for table mode)
        const wrapper = button.closest('.code-block-wrapper');
        const table = wrapper.querySelector('.lntable');
        
        if (table) {
          // In table mode, line numbers are in the first pre, code in the second (or last)
          const pres = table.querySelectorAll('pre code');
          if (pres.length > 0) {
             code = pres[pres.length - 1].textContent;
          } else {
             code = codeBlock.textContent;
          }
        } else {
           // Not in table mode, or fallback
           code = codeBlock.textContent;
        }

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
      wrapper.appendChild(button);
    });
  }

  // Add GQL syntax highlighting (basic)
  function addGQLHighlighting() {
    const gqlBlocks = document.querySelectorAll(
      'code.language-gql, code.language-graphql, code.language-geode, code.language-gcypher, code.language-cypher, code.language-gql\\+geode'
    );

    gqlBlocks.forEach((block) => {
      if (block.classList.contains('gql-highlighted')) return;

      let code = block.textContent;
      const placeholders = [];

      const stash = (type, value) => {
        const token = `@@${type}${placeholders.length}@@`;
        placeholders.push({ token, type, value });
        return token;
      };

      // GQL Keywords
      const keywords = [
        'MATCH', 'CREATE', 'MERGE', 'DELETE', 'REMOVE', 'SET', 'RETURN',
        'WHERE', 'WITH', 'OPTIONAL', 'UNWIND', 'UNION', 'CALL', 'YIELD',
        'ORDER', 'BY', 'SKIP', 'LIMIT', 'ASC', 'DESC', 'DISTINCT',
        'ON', 'DROP', 'INDEX', 'CONSTRAINT', 'UNIQUE', 'EXISTS',
        'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'AND', 'OR', 'NOT', 'XOR',
        'IN', 'STARTS', 'ENDS', 'CONTAINS', 'IS', 'AS', 'ALL', 'ANY',
        'NONE', 'SINGLE', 'SHOW', 'USE', 'GRAPH', 'DATABASE', 'CATALOG',
        'SCHEMA', 'TABLE', 'VIEW', 'DESCRIBE', 'EXPLAIN', 'PROFILE',
        'BEGIN', 'COMMIT', 'ROLLBACK', 'TRANSACTION', 'GRANT', 'REVOKE',
        'DENY', 'ROLE', 'USER', 'LOAD', 'CSV', 'FOREACH',
        'BTREE', 'HASH', 'FULLTEXT', 'SPATIAL', 'HNSW', 'RTREE',
        'TRIE', 'PATRICIA',
        // New from token.zig
        'LIKE', 'INTERSECT', 'EXCEPT', 'SESSION', 'RESET', 'CLOSE', 'INSERT',
        'VALUE', 'VALUES', 'SCAN', 'START', 'GROUP', 'OFFSET', 'HAVING',
        'NULLS', 'FIRST', 'LAST', 'UNKNOWN', 'FILTER', 'LET', 'SELECT',
        'FROM', 'DETACH', 'FOR', 'USING', 'JOIN', 'IF', 'KEY', 'KEYS',
        'LABELS', 'PERIODIC', 'PROPERTIES', 'RELATIONSHIPS', 'START_NODE',
        'END_NODE', 'TYPE', 'TYPES', 'ACYCLIC', 'AGGREGATE', 'AVG', 'CAST',
        'COUNT', 'CURRENT', 'DIFFERENT', 'EDGES', 'ELEMENT', 'FINISH',
        'HOME', 'LABELED', 'LOCAL', 'MAX', 'MIN', 'NEXT', 'OF', 'OTHERWISE',
        'PATHS', 'RECORD', 'REPEATABLE', 'REPLACE', 'REQUIRE', 'ASSERT',
        'SHORTEST', 'SIMPLE', 'SUM', 'TRAIL', 'WALK', 'ZONED', 'ZONE',
        'BINDING', 'BINDINGS', 'ORDINALITY', 'READ', 'WRITE', 'NO', 'ONLY'
      ];

      const types = [
        'BOOLEAN', 'INTEGER', 'INT', 'BIGINT', 'FLOAT', 'DOUBLE', 'DECIMAL',
        'NUMERIC', 'STRING', 'TEXT', 'UUID', 'DATE', 'TIME', 'DATETIME',
        'LOCALTIME', 'LOCALDATETIME', 'TIMESTAMP', 'DURATION', 'LIST', 'MAP',
        'NODE', 'EDGE', 'RELATIONSHIP', 'PATH', 'VECTOR', 'POINT',
        'BLOB', 'BYTES', 'JSON'
      ];

      const booleans = ['TRUE', 'FALSE'];
      const nulls = ['NULL'];

      const keywordSet = new Set(keywords.map((word) => word.toUpperCase()));
      const typeSet = new Set(types.map((word) => word.toUpperCase()));
      const booleanSet = new Set(booleans.map((word) => word.toUpperCase()));
      const nullSet = new Set(nulls.map((word) => word.toUpperCase()));

      const escapeHtml = (value) => value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

      // Escape HTML
      code = escapeHtml(code);

      // Preserve comments and strings first
      code = code.replace(/\/\*[\s\S]*?\*\//g, (match) => stash('comment', match));
      code = code.replace(/\/\/.*$/gm, (match) => stash('comment', match));
      code = code.replace(/(['"`])(?:\\.|(?!\1)[^\\\n])*\1/g, (match) => stash('string', match));

      // Highlight keywords (case-insensitive)
      const keywordRegex = new RegExp(`\\b(${keywords.join('|')})\\b`, 'gi');
      code = code.replace(keywordRegex, '<span class="keyword">$1</span>');

      const typeRegex = new RegExp(`\\b(${types.join('|')})\\b`, 'gi');
      code = code.replace(typeRegex, '<span class="type">$1</span>');

      const booleanRegex = new RegExp(`\\b(${booleans.join('|')})\\b`, 'gi');
      code = code.replace(booleanRegex, '<span class="boolean">$1</span>');

      const nullRegex = new RegExp(`\\b(${nulls.join('|')})\\b`, 'gi');
      code = code.replace(nullRegex, '<span class="null">$1</span>');

      // Highlight numbers
      code = code.replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="number">$1</span>');

      // Highlight variables (starting with $)
      code = code.replace(/(\$\w+)/g, '<span class="variable">$1</span>');

      // Highlight functions
      code = code.replace(/\b([a-zA-Z_][\w.]*)(?=\s*\()/g, (match) => {
        const upper = match.toUpperCase();
        if (keywordSet.has(upper) || typeSet.has(upper) || booleanSet.has(upper) || nullSet.has(upper)) {
          return match;
        }
        return `<span class="function">${match}</span>`;
      });

      // Highlight node labels (:Label)
      code = code.replace(/:(\w+)/g, ':<span class="class-name">$1</span>');

      // Highlight relationship types [-[:TYPE]->]
      code = code.replace(/\[:(\w+)\]/g, '[:<span class="type">$1</span>]');

      // Restore comments and strings
      placeholders.forEach((entry) => {
        const className = entry.type === 'comment' ? 'comment' : 'string';
        code = code.replace(entry.token, `<span class="${className}">${entry.value}</span>`);
      });

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
