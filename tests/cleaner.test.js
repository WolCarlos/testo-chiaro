// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_OPTIONS, PRESETS, cleanHtml, htmlToPlainText, plainTextToHtml,
  buildPortableHtml,
} from '../src/cleaner.js';
import { renderMarkdown } from '../src/markdown.js';

describe('pulizia HTML', () => {
  it('rimuove sfondo scuro, colore e script ma conserva il grassetto', () => {
    const result = cleanHtml('<div style="background:#111;color:white"><strong>Prova</strong><script>alert(1)</script></div>');
    expect(result).toContain('<strong>Prova</strong>');
    expect(result).not.toContain('background');
    expect(result).not.toContain('color:');
    expect(result).not.toContain('script');
  });

  it('conserva gli stili quando richiesto', () => {
    const result = cleanHtml('<p style="color: red; text-align: center; position: fixed">Testo</p>', PRESETS.structure);
    expect(result).toContain('color: red');
    expect(result).toContain('text-align: center');
    expect(result).not.toContain('position');
  });

  it('rimuove solo la formattazione richiesta', () => {
    const result = cleanHtml('<p><strong>Grassetto</strong> <em>Corsivo</em></p>', { removeBold: true });
    expect(result).not.toContain('<strong>');
    expect(result).toContain('<em>Corsivo</em>');
  });

  it('neutralizza i collegamenti pericolosi', () => {
    const result = cleanHtml('<a href="javascript:alert(1)" onclick="alert(1)">Collegamento</a>');
    expect(result).not.toContain('javascript');
    expect(result).not.toContain('onclick');
    expect(result).toContain('noopener noreferrer');
  });

  it('converte le tabelle in righe leggibili quando richiesto', () => {
    const result = cleanHtml('<table><tr><th>Nome</th><th>Valore</th></tr><tr><td>A</td><td>1</td></tr></table>', { removeTables: true });
    expect(result).not.toContain('<table>');
    expect(result).toContain('Nome — Valore');
    expect(result).toContain('A — 1');
  });

  it('aggiunge testo alternativo vuoto alle immagini decorative', () => {
    const result = cleanHtml('<img src="https://example.com/a.png">');
    expect(result).toContain('alt=""');
    expect(result).toContain('loading="lazy"');
  });
});

describe('conversioni', () => {
  it('converte Markdown in HTML semantico sicuro', () => {
    const result = renderMarkdown('# Titolo\n\n**Testo** con [link](https://example.com).\n\n- uno\n- due\n\n<script>alert(1)</script>', DEFAULT_OPTIONS);
    expect(result).toContain('<h1>Titolo</h1>');
    expect(result).toContain('<strong>Testo</strong>');
    expect(result).toContain('<ul>');
    expect(result).not.toContain('<script>');
    expect(result).toContain('&lt;script&gt;');
  });

  it('estrae testo semplice con paragrafi separati', () => {
    expect(htmlToPlainText('<h1>Titolo</h1><p>Prima riga<br>Seconda riga</p>')).toBe('Titolo\n\nPrima riga\nSeconda riga');
  });

  it('protegge il testo semplice convertito in HTML', () => {
    expect(plainTextToHtml('<img>\n\nA & B')).toBe('<p>&lt;img&gt;</p><p>A &amp; B</p>');
  });

  it('crea un contenitore chiaro per Thunderbird', () => {
    const result = buildPortableHtml('<p>Testo</p>', DEFAULT_OPTIONS);
    expect(result).toContain('background-color:#ffffff');
    expect(result).toContain('color:#111827');
    expect(result).toContain('font-size:11pt');
  });
});
