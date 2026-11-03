import MarkdownIt from 'markdown-it';
import taskLists from 'markdown-it-task-lists';
import { cleanHtml } from './cleaner.js';

const markdown = new MarkdownIt({
  html: false,
  breaks: false,
  linkify: true,
  typographer: true,
}).use(taskLists, { enabled: true, label: true, labelAfter: true });

export function renderMarkdown(source, options) {
  return cleanHtml(markdown.render(String(source || '')), options);
}

export function getMarkdownTitle(source) {
  const match = String(source || '').match(/^#\s+(.+)$/m);
  return match ? match[1].replace(/[*_`~[\]]/g, '').trim() : '';
}
