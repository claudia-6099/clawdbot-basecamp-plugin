import { formatAsHtml, createDetails, createTable } from '../send.js';

describe('formatAsHtml', () => {
  it('should wrap plain text in paragraph tags', () => {
    const result = formatAsHtml('Hello world');
    expect(result).toBe('<p>Hello world</p>');
  });

  it('should convert **bold** to <strong>', () => {
    const result = formatAsHtml('This is **bold** text');
    expect(result).toContain('<strong>bold</strong>');
  });

  it('should convert *italic* to <em>', () => {
    const result = formatAsHtml('This is *italic* text');
    expect(result).toContain('<em>italic</em>');
  });

  it('should convert [link](url) to <a>', () => {
    const result = formatAsHtml('Check [this link](https://example.com)');
    expect(result).toContain('<a href="https://example.com">this link</a>');
  });

  it('should convert newlines to <br>', () => {
    const result = formatAsHtml('Line 1\nLine 2');
    expect(result).toContain('<br>');
  });

  it('should escape HTML entities', () => {
    const result = formatAsHtml('Test <script>alert("xss")</script>');
    expect(result).not.toContain('<script>');
    expect(result).toContain('&lt;script&gt;');
  });

  it('should handle mixed formatting', () => {
    const result = formatAsHtml('**Bold** and *italic* with [link](https://test.com)');
    expect(result).toContain('<strong>Bold</strong>');
    expect(result).toContain('<em>italic</em>');
    expect(result).toContain('<a href="https://test.com">link</a>');
  });
});

describe('createDetails', () => {
  it('should create collapsible details element', () => {
    const result = createDetails('Summary Text', 'Content here');
    expect(result).toBe('<details><summary>Summary Text</summary>Content here</details>');
  });

  it('should handle HTML content', () => {
    const result = createDetails('Click me', '<p>Hidden content</p>');
    expect(result).toContain('<summary>Click me</summary>');
    expect(result).toContain('<p>Hidden content</p>');
  });
});

describe('createTable', () => {
  it('should create table with headers and rows', () => {
    const headers = ['Name', 'Age'];
    const rows = [
      ['Alice', '30'],
      ['Bob', '25']
    ];
    const result = createTable(headers, rows);
    
    expect(result).toContain('<table border="1">');
    expect(result).toContain('<thead>');
    expect(result).toContain('<th>Name</th>');
    expect(result).toContain('<th>Age</th>');
    expect(result).toContain('<tbody>');
    expect(result).toContain('<td>Alice</td>');
    expect(result).toContain('<td>30</td>');
  });

  it('should handle empty rows', () => {
    const headers = ['Column 1'];
    const rows: string[][] = [];
    const result = createTable(headers, rows);
    
    expect(result).toContain('<thead>');
    expect(result).toContain('<tbody></tbody>');
  });

  it('should handle multiple rows', () => {
    const headers = ['A', 'B', 'C'];
    const rows = [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9']
    ];
    const result = createTable(headers, rows);
    
    const rowMatches = result.match(/<tr>/g);
    expect(rowMatches).toHaveLength(4); // 1 header + 3 data rows
  });
});
