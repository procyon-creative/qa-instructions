import { HtmlPage } from '../render/html-page.js';
import { HTML_STYLE } from '../render/html-style.js';
import { InlineMarkup } from '../render/inline-markup.js';
import { QaReportIndexView, type QaReportEntry } from './index-view.js';

/** The index's table, on top of the style every page shares. */
const INDEX_STYLE = `${HTML_STYLE}
table {
  width: 100%;
  border-collapse: collapse;
}
th, td {
  text-align: left;
  padding: 0.5rem;
  border-bottom: 1px solid var(--border);
}
a {
  color: var(--note-border);
}
.status.incomplete {
  color: var(--fail);
  font-weight: 600;
}`;

/**
 * The QA Report's `index.html`: a table of every test, its title linking to
 * its page, its status, and a link to its Jira-ready text.
 */
export class QaReportIndexHtml {
  constructor(private readonly page = new HtmlPage(INDEX_STYLE)) {}

  render(view: QaReportIndexView): string {
    const body =
      view.tests.length === 0
        ? ['<p>No test produced QA Instructions.</p>']
        : [
            `<p>${view.summary}</p>`,
            '<table>',
            '<thead>',
            '<tr><th>Test</th><th>Status</th><th>Jira text</th></tr>',
            '</thead>',
            '<tbody>',
            ...view.tests.flatMap((entry) => this.row(entry)),
            '</tbody>',
            '</table>',
          ];
    return this.page.render(QaReportIndexView.TITLE, body);
  }

  private row(entry: QaReportEntry): string[] {
    const href = (link: string) => InlineMarkup.escapeHtml(link);
    return [
      '<tr>',
      `<td><a href="${href(entry.page)}">${InlineMarkup.escapeHtml(entry.title)}</a></td>`,
      `<td class="status ${entry.status}">${entry.statusLabel}</td>`,
      `<td><a href="${href(entry.text)}">Jira text</a></td>`,
      '</tr>',
    ];
  }
}
