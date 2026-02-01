import fetch from 'node-fetch';
import type { BasecampLinePayload } from './types.js';

/**
 * Send a message to Basecamp
 * POSTs HTML content to the callback_url
 */
export async function sendToBasecamp(
  callbackUrl: string,
  content: string
): Promise<void> {
  console.log('[Basecamp] Sending message to:', callbackUrl);
  console.log('[Basecamp] Content length:', content.length);

  const payload: BasecampLinePayload = {
    content: formatAsHtml(content)
  };

  const response = await fetch(callbackUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  console.log('[Basecamp] Response status:', response.status);

  if (!response.ok) {
    const errorMsg = `Failed to send to Basecamp: ${response.status} ${response.statusText}`;
    console.error('[Basecamp] Error:', errorMsg);
    throw new Error(errorMsg);
  }

  console.log('[Basecamp] Message sent successfully');
}

/**
 * Convert plain text/markdown to Basecamp-compatible HTML
 * Basecamp supports: p, strong, em, a, ul, ol, li, br, table, tr, td, th, thead, tbody, details, summary
 */
export function formatAsHtml(text: string): string {
  // Basic text to HTML conversion
  // TODO: Add more sophisticated markdown parsing if needed
  
  // Escape HTML entities
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  // Convert **bold** to <strong>
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  
  // Convert *italic* to <em>
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  
  // Convert [link](url) to <a>
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  
  // Convert newlines to <br>
  html = html.replace(/\n/g, '<br>');
  
  // Wrap in paragraph
  html = `<p>${html}</p>`;
  
  return html;
}

/**
 * Create a collapsible details block (useful for long responses)
 */
export function createDetails(summary: string, content: string): string {
  return `<details><summary>${summary}</summary>${content}</details>`;
}

/**
 * Create a table (useful for structured data)
 */
export function createTable(
  headers: string[],
  rows: string[][]
): string {
  const headerRow = `<tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>`;
  const bodyRows = rows
    .map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`)
    .join('');
  
  return `<table border="1"><thead>${headerRow}</thead><tbody>${bodyRows}</tbody></table>`;
}
