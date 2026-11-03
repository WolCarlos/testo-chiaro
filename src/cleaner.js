import DOMPurify from 'dompurify';

export const DEFAULT_OPTIONS = Object.freeze({
  removeColor: true,
  removeBackground: true,
  removeFontFamily: true,
  removeFontSize: true,
  forceLight: true,
  removeBold: false,
  removeItalic: false,
  removeUnderline: false,
  removeStrike: false,
  removeAlignment: true,
  removeLineSpacing: true,
  removeLayout: true,
  removeLinks: false,
  removeImages: false,
  removeHeadings: false,
  removeLists: false,
  removeTables: false,
  removeCode: false,
  removeQuotes: false,
  fontFamily: 'Arial, Helvetica, sans-serif',
  fontSize: 11,
  lineHeight: '1.5',
  pdfPageSize: 'A4',
  pdfLandscape: 'false',
  pdfMargins: 'normal',
  pdfIncludeTitle: true,
  documentTitle: 'Documento pulito',
});

export const PRESETS = {
  recommended: { ...DEFAULT_OPTIONS },
  plain: {
    ...DEFAULT_OPTIONS,
    removeBold: true,
    removeItalic: true,
    removeUnderline: true,
    removeStrike: true,
    removeLinks: true,
    removeImages: true,
    removeHeadings: true,
    removeLists: true,
    removeTables: true,
    removeCode: true,
    removeQuotes: true,
  },
  structure: {
    ...DEFAULT_OPTIONS,
    removeColor: false,
    removeBackground: false,
    removeFontFamily: false,
    removeFontSize: false,
    forceLight: false,
    removeAlignment: false,
    removeLineSpacing: false,
    removeLayout: false,
  },
};

const STYLE_GROUPS = {
  removeColor: ['color'],
  removeBackground: ['background', 'background-color'],
  removeFontFamily: ['font-family'],
  removeFontSize: ['font-size'],
  removeAlignment: ['text-align'],
  removeLineSpacing: ['line-height', 'letter-spacing', 'word-spacing'],
};

const SAFE_STYLE_PROPERTIES = new Set([
  'color', 'background', 'background-color', 'font-family', 'font-size',
  'font-weight', 'font-style', 'text-decoration', 'text-decoration-line',
  'text-align', 'line-height', 'letter-spacing', 'word-spacing', 'margin',
  'margin-top', 'margin-right', 'margin-bottom', 'margin-left', 'padding',
  'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'text-indent', 'border', 'border-top', 'border-right', 'border-bottom',
  'border-left', 'border-radius', 'vertical-align', 'white-space',
]);

const SAFE_ATTRIBUTES = new Set([
  'href', 'src', 'alt', 'title', 'width', 'height', 'colspan', 'rowspan',
  'scope', 'headers', 'start', 'reversed', 'type', 'checked', 'disabled',
  'lang', 'dir', 'cite', 'datetime', 'open', 'color', 'face', 'size',
]);

function unwrap(element) {
  element.replaceWith(...element.childNodes);
}

function sanitizeHtml(input) {
  return DOMPurify.sanitize(String(input || ''), {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['script', 'style', 'noscript', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'select', 'textarea', 'svg', 'math', 'meta', 'link', 'base'],
    ALLOW_DATA_URI: true,
  });
}

export function cleanHtml(input, userOptions = {}) {
  const options = { ...DEFAULT_OPTIONS, ...userOptions };
  const template = document.createElement('template');
  template.innerHTML = sanitizeHtml(input);
  const root = template.content;

  if (options.removeImages) root.querySelectorAll('img, picture, video, audio').forEach((el) => el.remove());
  if (options.removeLinks) root.querySelectorAll('a').forEach(unwrap);
  if (options.removeHeadings) root.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(unwrap);
  if (options.removeBold) root.querySelectorAll('b, strong').forEach(unwrap);
  if (options.removeItalic) root.querySelectorAll('i, em').forEach(unwrap);
  if (options.removeUnderline) root.querySelectorAll('u').forEach(unwrap);
  if (options.removeStrike) root.querySelectorAll('s, strike, del').forEach(unwrap);
  if (options.removeCode) root.querySelectorAll('code, kbd, samp').forEach(unwrap);
  if (options.removeQuotes) root.querySelectorAll('blockquote, q').forEach(unwrap);

  if (options.removeLists) {
    root.querySelectorAll('li').forEach((item) => {
      const paragraph = document.createElement('p');
      paragraph.append(...item.childNodes);
      item.replaceWith(paragraph);
    });
    root.querySelectorAll('ul, ol, dl, menu').forEach(unwrap);
    root.querySelectorAll('dt, dd').forEach(unwrap);
  }

  if (options.removeTables) {
    root.querySelectorAll('table').forEach((table) => {
      const fragment = document.createDocumentFragment();
      table.querySelectorAll('tr').forEach((row) => {
        const paragraph = document.createElement('p');
        paragraph.textContent = [...row.querySelectorAll('th, td')]
          .filter((cell) => cell.closest('table') === table)
          .map((cell) => cell.textContent.trim())
          .filter(Boolean)
          .join(' — ');
        if (paragraph.textContent) fragment.append(paragraph);
      });
      table.replaceWith(fragment);
    });
  }

  root.querySelectorAll('*').forEach((element) => {
    const style = element.getAttribute('style');
    if (style) {
      const properties = Array.from({ length: element.style.length }, (_, index) => element.style.item(index));
      if (properties.length === 0) element.removeAttribute('style');
      for (const property of properties) {
        const lower = property.toLowerCase();
        let remove = !SAFE_STYLE_PROPERTIES.has(lower);
        for (const [option, properties] of Object.entries(STYLE_GROUPS)) {
          if (options[option] && properties.includes(lower)) remove = true;
        }
        if (options.removeLayout && /^(margin|padding|border|text-indent)/.test(lower)) remove = true;
        if (options.removeBold && lower === 'font-weight') remove = true;
        if (options.removeItalic && lower === 'font-style') remove = true;
        if (options.removeUnderline && lower.startsWith('text-decoration')) remove = true;
        if (options.removeStrike && lower.startsWith('text-decoration')) remove = true;
        if (remove) element.style.removeProperty(property);
      }
      if (!element.getAttribute('style')?.trim()) element.removeAttribute('style');
    }

    for (const attribute of [...element.attributes]) {
      const name = attribute.name.toLowerCase();
      if (name === 'style' || SAFE_ATTRIBUTES.has(name)) continue;
      element.removeAttribute(attribute.name);
    }

    if (element.tagName === 'FONT') {
      if (options.removeColor) element.removeAttribute('color');
      if (options.removeFontFamily) element.removeAttribute('face');
      if (options.removeFontSize) element.removeAttribute('size');
    }
    if (element.tagName === 'A') {
      const href = element.getAttribute('href') || '';
      if (/^\s*javascript:/i.test(href)) element.removeAttribute('href');
      element.setAttribute('rel', 'noopener noreferrer');
    }
    if (element.tagName === 'IMG') {
      element.setAttribute('loading', 'lazy');
      if (!element.hasAttribute('alt')) element.setAttribute('alt', '');
    }
  });

  root.querySelectorAll('pre').forEach((pre) => {
    if (options.removeCode) {
      const paragraph = document.createElement('p');
      paragraph.textContent = pre.textContent;
      pre.replaceWith(paragraph);
    }
  });
  if (options.removeAlignment) root.querySelectorAll('center').forEach(unwrap);
  root.querySelectorAll('span, font, div').forEach((element) => {
    if (!element.attributes.length && element.tagName !== 'DIV') unwrap(element);
  });

  return template.innerHTML;
}

export function htmlToPlainText(input) {
  const template = document.createElement('template');
  template.innerHTML = sanitizeHtml(input);
  template.content.querySelectorAll('script, style, noscript').forEach((el) => el.remove());
  template.content.querySelectorAll('br').forEach((el) => el.replaceWith('\n'));
  template.content.querySelectorAll('p, h1, h2, h3, h4, h5, h6, pre, blockquote').forEach((el) => el.append('\n\n'));
  template.content.querySelectorAll('div, section, article, li, tr').forEach((el) => el.append('\n'));
  template.content.querySelectorAll('th, td').forEach((el) => el.append('\t'));
  return (template.content.textContent || '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function plainTextToHtml(text) {
  return String(text || '').replace(/\r\n?/g, '\n').split(/\n{2,}/).map((paragraph) => {
    const escaped = paragraph.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
    return `<p>${escaped || '<br>'}</p>`;
  }).join('');
}

export function outputWrapperStyle(options = DEFAULT_OPTIONS) {
  const merged = { ...DEFAULT_OPTIONS, ...options };
  const color = merged.forceLight ? 'color:#111827;background-color:#ffffff;' : '';
  return `${color}font-family:${merged.fontFamily};font-size:${Number(merged.fontSize) || 11}pt;line-height:${merged.lineHeight};`;
}

export function buildPortableHtml(bodyHtml, options = DEFAULT_OPTIONS) {
  return `<div style="${outputWrapperStyle(options)}">${bodyHtml}</div>`;
}
