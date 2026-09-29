import { HTML_STYLE } from './html-style.js';
import { InlineMarkup } from './inline-markup.js';

/** Nothing may load from the network: styles are inline, images data URIs. */
const CONTENT_SECURITY_POLICY =
  "default-src 'none'; img-src data:; style-src 'unsafe-inline'";

/**
 * The standalone page every HTML output shares: inline styles for light and
 * dark schemes and a Content Security Policy that blocks the network, so a
 * page works offline, from disk, or as a CI artifact.
 */
export class HtmlPage {
  constructor(private readonly style = HTML_STYLE) {}

  /** A whole page with `body` inside `<main>`; `title` is plain text. */
  render(title: string, body: readonly string[]): string {
    const escaped = InlineMarkup.escapeHtml(title);
    return (
      [
        '<!doctype html>',
        '<html lang="en">',
        '<head>',
        '<meta charset="utf-8">',
        '<meta name="viewport" content="width=device-width, initial-scale=1">',
        '<meta name="color-scheme" content="light dark">',
        `<meta http-equiv="Content-Security-Policy" content="${CONTENT_SECURITY_POLICY}">`,
        `<title>${escaped}</title>`,
        `<style>\n${this.style}\n</style>`,
        '</head>',
        '<body>',
        '<main>',
        `<h1>${escaped}</h1>`,
        ...body,
        '</main>',
        '</body>',
        '</html>',
      ].join('\n') + '\n'
    );
  }
}
