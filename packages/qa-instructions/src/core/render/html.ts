import { HtmlPage } from './html-page.js';
import type { StepImages } from './images.js';
import { InlineMarkup } from './inline-markup.js';
import { QaWording, type QaInstructionsView, type QaStepView } from './view.js';

/** The QA Instructions title is `<h1>`; Sections start one level below it. */
const SECTION_LEVEL = 2;
const MAX_LEVEL = 6;

/**
 * A standalone HTML page (see `HtmlPage`): nested Sections as nested
 * `<section>`s, and each Step Screenshot with alt text from its Action.
 */
export class HtmlRenderer {
  constructor(
    private readonly images?: StepImages,
    private readonly page = new HtmlPage(),
  ) {}

  render(view: QaInstructionsView): string {
    const lines: string[] = [];

    if (view.incomplete) {
      lines.push(
        `<p class="note" role="note"><strong>${QaWording.incomplete}:</strong> ${InlineMarkup.escapeHtml(view.incomplete)}</p>`,
      );
    }
    if (view.prerequisite) {
      lines.push(`<p>${InlineMarkup.toHtml(view.prerequisite)}</p>`);
    }

    let open = 0;
    for (const run of view.runs) {
      lines.push(...Array<string>(run.closes).fill('</section>'));
      run.section.slice(run.shared).forEach((sectionTitle, i) => {
        const level = Math.min(SECTION_LEVEL + run.shared + i, MAX_LEVEL);
        lines.push(
          '<section>',
          `<h${level}>${InlineMarkup.toHtml(sectionTitle)}</h${level}>`,
        );
      });
      open = run.section.length;

      lines.push(`<ol start="${run.steps[0]?.number ?? 1}">`);
      for (const step of run.steps) lines.push(...this.step(step));
      lines.push('</ol>');
    }
    lines.push(...Array<string>(open).fill('</section>'));

    return this.page.render(view.title, lines);
  }

  private step(step: QaStepView): string[] {
    const classes = [
      step.warning && 'warning',
      step.failure && 'failed',
    ].filter(Boolean);
    const warning = step.warning
      ? `<strong>${QaWording.warning}:</strong> `
      : '';
    const approximate = step.approximate
      ? ` <em class="approximate">(${QaWording.approximate})</em>`
      : '';

    const paragraphs = [
      `<p>${warning}${InlineMarkup.toHtml(step.action)}${approximate}`,
    ];
    if (step.expected) {
      paragraphs.push(
        `<p><strong>${QaWording.expected}:</strong> ${InlineMarkup.toHtml(step.expected)}`,
      );
    }
    if (step.failure) {
      paragraphs[paragraphs.length - 1] +=
        ` (<strong class="failed-here">${step.failure}</strong>)`;
    }

    const lines = [
      classes.length > 0 ? `<li class="${classes.join(' ')}">` : '<li>',
      ...paragraphs.map((paragraph) => `${paragraph}</p>`),
    ];
    const src = step.screenshot && this.images?.src(step.screenshot.asset);
    if (step.screenshot && src) {
      lines.push(
        `<figure><img src="${src}" alt="${InlineMarkup.escapeHtml(step.screenshot.alt)}"></figure>`,
      );
    }
    lines.push('</li>');
    return lines;
  }
}
