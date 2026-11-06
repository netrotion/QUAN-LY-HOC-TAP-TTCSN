import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MarkdownContent } from '../src/components/MarkdownContent.js';

test('MarkdownContent: renders null/empty content gracefully', () => {
  const elNull = React.createElement(MarkdownContent, { content: null });
  const htmlNull = renderToStaticMarkup(elNull);
  assert.equal(htmlNull, '');

  const elEmpty = React.createElement(MarkdownContent, { content: '' });
  const htmlEmpty = renderToStaticMarkup(elEmpty);
  assert.equal(htmlEmpty, '');
});

test('MarkdownContent: renders bold and italic markdown correctly', () => {
  const content = 'Điểm **GPA** được tính theo *công thức* chuẩn.';
  const el = React.createElement(MarkdownContent, { content });
  const html = renderToStaticMarkup(el);

  assert.ok(html.includes('<strong>GPA</strong>'), 'phải có thẻ <strong> cho **GPA**');
  assert.ok(html.includes('<em>công thức</em>'), 'phải có thẻ <em> cho *công thức*');
  assert.ok(!html.includes('**GPA**'), 'không được để sót dấu ** nguyên ký tự');
});

test('MarkdownContent: renders LaTeX math formulas via KaTeX', () => {
  const content = 'Công thức: $$\\text{GPA} = \\frac{A}{B}$$ và biến $a_i$.';
  const el = React.createElement(MarkdownContent, { content });
  const html = renderToStaticMarkup(el);

  // KaTeX renders with class katex, katex-display
  assert.ok(html.includes('katex'), 'phải kích hoạt KaTeX class trong HTML');
  assert.ok(!html.includes('$$\\text{GPA}'), 'không được để nguyên cú pháp thô $$\\text{GPA}');
});

test('MarkdownContent: renders GFM tables with styled wrappers', () => {
  const content = `| Môn học | Tín chỉ | Điểm |
|---|---|---|
| IT6015 | 3 | A |`;
  const el = React.createElement(MarkdownContent, { content });
  const html = renderToStaticMarkup(el);

  assert.ok(html.includes('<table'), 'phải render thẻ <table>');
  assert.ok(html.includes('<th>Môn học</th>') || html.includes('Môn học'), 'phải có tiêu đề bảng');
  assert.ok(html.includes('<td>IT6015</td>') || html.includes('IT6015'), 'phải có dữ liệu bảng');
});

test('MarkdownContent: enforces security for external links (noopener noreferrer)', () => {
  const content = '[Trang đào tạo](https://sv.haui.edu.vn)';
  const el = React.createElement(MarkdownContent, { content });
  const html = renderToStaticMarkup(el);

  assert.ok(html.includes('href="https://sv.haui.edu.vn"'), 'phải có href đúng');
  assert.ok(html.includes('target="_blank"'), 'link ngoài phải có target="_blank"');
  assert.ok(html.includes('rel="noopener noreferrer"'), 'link ngoài phải có rel="noopener noreferrer"');
});

test('MarkdownContent: sanitizes untrusted raw script HTML to prevent XSS', () => {
  const content = 'Test XSS: <script>alert("hacked")</script> và <img src="x" onerror="alert(1)">';
  const el = React.createElement(MarkdownContent, { content });
  const html = renderToStaticMarkup(el);

  assert.ok(!html.includes('<script>alert'), 'tuyệt đối không render thực thi thẻ <script>');
  assert.ok(!html.includes('onerror="alert(1)"'), 'tuyệt đối không render thuộc tính onerror');
});
