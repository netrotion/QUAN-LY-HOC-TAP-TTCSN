import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

/**
 * Component render Markdown và công thức toán học LaTeX chuẩn xác & an toàn:
 * - Hỗ trợ chuẩn GitHub Flavored Markdown (GFM): Bảng (tables), strikethrough, autolinks, tasklists.
 * - Hỗ trợ công thức toán LaTeX qua remark-math và rehype-katex: Inline ($x$) và Display block ($$x$$).
 * - Phòng chống tấn công XSS: react-markdown mặc định không cho phép raw HTML thực thi.
 * - Liên kết ngoài an toàn: target="_blank" kèm rel="noopener noreferrer".
 * - Sử dụng pure React.createElement để tương thích hoàn toàn với packaging của TV3.
 */
export function MarkdownContent({ content, className = '' }) {
  if (!content || typeof content !== 'string') {
    return null;
  }

  return React.createElement(
    'div',
    {
      className: `haui-markdown-content ${className}`.trim(),
      style: { fontSize: '14px', lineHeight: 1.6, color: 'var(--color-ink)' }
    },
    React.createElement(
      ReactMarkdown,
      {
        remarkPlugins: [remarkGfm, remarkMath],
        rehypePlugins: [rehypeKatex],
        components: {
          a: ({ node, ...props }) => {
            const isExternal = props.href && (props.href.startsWith('http://') || props.href.startsWith('https://'));
            return React.createElement('a', {
              ...props,
              target: isExternal ? '_blank' : undefined,
              rel: isExternal ? 'noopener noreferrer' : undefined,
              style: { color: 'var(--color-brand-blue, #0284c7)', textDecoration: 'underline' }
            });
          },
          table: ({ node, ...props }) => {
            return React.createElement(
              'div',
              { style: { overflowX: 'auto', margin: '12px 0' } },
              React.createElement('table', {
                ...props,
                style: {
                  width: '100%',
                  borderCollapse: 'collapse',
                  border: '1px solid var(--color-hairline, #e2e8f0)',
                  fontSize: '13px'
                }
              })
            );
          },
          th: ({ node, ...props }) => {
            return React.createElement('th', {
              ...props,
              style: {
                backgroundColor: 'var(--color-canvas, #f8fafc)',
                border: '1px solid var(--color-hairline, #e2e8f0)',
                padding: '8px 12px',
                textAlign: 'left',
                fontWeight: 600
              }
            });
          },
          td: ({ node, ...props }) => {
            return React.createElement('td', {
              ...props,
              style: {
                border: '1px solid var(--color-hairline, #e2e8f0)',
                padding: '8px 12px'
              }
            });
          },
          p: ({ node, ...props }) => {
            return React.createElement('p', {
              ...props,
              style: { margin: '0 0 10px 0', lineHeight: 1.6 }
            });
          },
          ul: ({ node, ...props }) => {
            return React.createElement('ul', {
              ...props,
              style: { margin: '0 0 10px 0', paddingLeft: '20px' }
            });
          },
          ol: ({ node, ...props }) => {
            return React.createElement('ol', {
              ...props,
              style: { margin: '0 0 10px 0', paddingLeft: '20px' }
            });
          },
          li: ({ node, ...props }) => {
            return React.createElement('li', {
              ...props,
              style: { marginBottom: '4px' }
            });
          },
          code: ({ node, inline, className: codeClass, children, ...props }) => {
            if (inline) {
              return React.createElement(
                'code',
                {
                  ...props,
                  style: {
                    backgroundColor: 'var(--color-canvas, #f1f5f9)',
                    color: 'var(--color-ink, #0f172a)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '12.5px',
                    fontFamily: 'Consolas, Monaco, monospace'
                  }
                },
                children
              );
            }
            return React.createElement(
              'pre',
              {
                style: {
                  backgroundColor: 'var(--color-canvas, #f1f5f9)',
                  padding: '12px',
                  borderRadius: '8px',
                  overflowX: 'auto',
                  margin: '10px 0'
                }
              },
              React.createElement(
                'code',
                {
                  ...props,
                  style: { fontFamily: 'Consolas, Monaco, monospace', fontSize: '13px' }
                },
                children
              )
            );
          },
          blockquote: ({ node, ...props }) => {
            return React.createElement('blockquote', {
              ...props,
              style: {
                borderLeft: '4px solid var(--color-brand-blue, #0284c7)',
                margin: '10px 0',
                padding: '6px 12px',
                color: 'var(--color-mid-gray, #64748b)',
                backgroundColor: 'var(--color-canvas, #f8fafc)'
              }
            });
          }
        }
      },
      content
    )
  );
}

export default MarkdownContent;
