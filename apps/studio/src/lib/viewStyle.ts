/**
 * How every written view is set, whatever wrote it.
 *
 * A generator writing its own styling made two views of one board look,
 * like they came from two products,
 * one light and serif and one dark and carded.
 * The look belongs to the surface reading them,
 * rather than to whichever run happened to produce one,
 * so it is given here and a generator writes only what a thing is.
 *
 * The class names a generator may use are documented for it,
 * in the plugin's own reference, at `skills/shared/style.md`.
 */

/**
 * The palette a view borrows, named rather than copied.
 *
 * A sandboxed frame is its own document and inherits no stylesheet,
 * so these have to be written into it.
 * Reading them off this application at the moment a view is drawn,
 * is what keeps the two from drifting,
 * and is what will carry a second palette into a view,
 * on the day this one gains one.
 */
const BORROWED = [
  'canvas',
  'surface',
  'raised',
  'ink',
  'ink-muted',
  'ink-subtle',
  'line',
  'line-strong',
  'contradicts',
] as const

/** The palette as this application currently has it, ready to be written in. */
export function paletteOf(from: Element): string {
  const held = getComputedStyle(from)
  const taken = BORROWED
    .map(name => `--${name}: ${held.getPropertyValue(`--${name}`).trim()};`)
    .join(' ')
  return `<style>:root { color-scheme: light; ${taken} }</style>`
}

/** Which of this application's own colours a view is allowed to borrow. */
export const BORROWED_TOKENS: readonly string[] = BORROWED

/**
 * What a view is set in, which is one stylesheet for all three forms.
 * Every colour here is borrowed rather than chosen,
 * so nothing in a written view can disagree with the surface it is read on.
 */
export const VIEW_STYLE = `<style>
  * { box-sizing: border-box }

  body {
    margin: 0 auto;
    padding: 3.5rem 2.5rem 6rem;
    max-width: 46rem;
    background: var(--canvas);
    color: var(--ink);
    font: 15px/1.7 ui-serif, Georgia, "Songti TC", serif;
  }

  h1, h2, h3, .label, summary {
    font-family: ui-sans-serif, system-ui, "PingFang TC", sans-serif;
    line-height: 1.25;
  }
  h1 { font-size: 1.7rem; margin: 0 0 .4rem }
  h2 { font-size: 1.15rem; margin: 3rem 0 .8rem }
  h3 { font-size: 1rem; margin: 1.8rem 0 .4rem }
  p { margin: 0 0 1rem }

  /* The opening sentence, which says what the whole page is for. */
  .lede { color: var(--ink-muted); margin-bottom: 2.5rem }

  /* One thing the reader is being told about, and everything under it. */
  .term { margin: 0 0 2.5rem }

  /* An assertion, set apart from the prose that explains it. */
  .claim {
    margin: 0 0 .8rem;
    padding-left: .9rem;
    border-left: 2px solid var(--line-strong);
  }

  /* An assertion the sources disagree about, which is never settled here. */
  .contested { border-left-color: var(--contradicts) }
  .contested .label { color: var(--contradicts) }

  /* What follows, said in a word rather than only in a colour. */
  .label {
    display: inline-block;
    margin-bottom: .2rem;
    font-size: .7rem;
    letter-spacing: .06em;
    text-transform: uppercase;
    color: var(--ink-subtle);
  }

  /* Where something came from, so a reader can go and check it. */
  .source { font-size: .85em }
  .source a { color: var(--ink-muted) }

  /* One question, and the answer a reader opens for themselves. */
  .question {
    margin: 0 0 1.4rem;
    padding: 1rem 1.2rem;
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 8px;
  }
  .question > p:last-of-type { margin-bottom: 0 }
  details { margin-top: .6rem }
  summary { cursor: pointer; font-size: .85rem; color: var(--ink-muted) }
  details[open] summary { margin-bottom: .6rem }

  /* A drawing, which is the one thing a generator composes freely. */
  figure { margin: 1.8rem 0; text-align: center }
  figure svg { max-width: 100%; height: auto }
  figcaption { margin-top: .5rem; font-size: .85em; color: var(--ink-subtle) }

  ul, ol { margin: 0 0 1rem; padding-left: 1.4rem }
  li { margin-bottom: .35rem }
  code { font: .9em ui-monospace, monospace; background: var(--raised); padding: .1em .3em; border-radius: 3px }
  hr { border: 0; border-top: 1px solid var(--line); margin: 2.5rem 0 }
  a { color: var(--ink) }
  table { border-collapse: collapse; width: 100%; font-size: .9em; margin: 1rem 0 }
  th, td { border: 1px solid var(--line); padding: .4rem .6rem; text-align: left }
</style>`

/**
 * Whether what a generator wrote is already a whole document.
 *
 * A fragment is what is asked for,
 * and is what gets this application's own look.
 * Something arriving as a whole page brought its own, so it is left alone,
 * rather than nested inside a second document,
 * which is how a page comes out blank.
 */
export function isWholePage(text: string): boolean {
  return /^\s*<(?:!doctype\s+html|html[\s>])/i.test(text)
}

/** A fragment made into a page, set in this application's own colours. */
export function pageAround(body: string, palette: string): string {
  return `<!doctype html><meta charset="utf-8">${palette}${VIEW_STYLE}<body>${body}</body>`
}
