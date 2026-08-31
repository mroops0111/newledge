import { VIEW_BEHAVIOUR } from './viewBehaviour.js'

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
  'supports',
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

  /* One step in a sequence, shown alone when a page has more than one. */
  .chapter { margin: 0 0 3rem }

  /* In the sequence, but not the step the reader is standing on. */
  .offstage { display: none }

  /* One question, everything belonging to it, and nothing revealed early. */
  .question {
    margin: 1.6rem 0;
    padding: 1.1rem 1.3rem;
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 8px;
  }
  .ask { margin: 0 0 .9rem; font-weight: 600 }

  .choices { margin: 0; padding: 0; list-style: none }
  .choice {
    margin: 0 0 .45rem;
    padding: .55rem .8rem;
    border: 1px solid var(--line);
    border-radius: 6px;
    cursor: pointer;
    transition: background-color .12s, border-color .12s;
  }
  .choice:hover { background: var(--raised) }
  .done .choice { cursor: default }
  .done .choice:hover { background: transparent }

  /* What was right, and what the reader reached for instead. */
  .choice.correct {
    border-color: var(--supports);
    background: color-mix(in oklab, var(--supports) 10%, transparent);
  }
  .choice.wrong {
    border-color: var(--contradicts);
    background: color-mix(in oklab, var(--contradicts) 10%, transparent);
  }

  /* Kept back until the reader has answered, since seeing it is not knowing it. */
  .answer { display: none }
  .answer.shown {
    display: block;
    margin-top: .9rem;
    padding-top: .8rem;
    border-top: 1px solid var(--line);
    color: var(--ink-muted);
  }
  .answer > p:last-child { margin-bottom: 0 }

  /* A drawing, which is the one thing a generator composes freely. */
  figure { margin: 1.8rem 0; text-align: center }
  figure svg { max-width: 100%; height: auto }
  figcaption { margin-top: .5rem; font-size: .85em; color: var(--ink-subtle) }

  blockquote {
    margin: 1.2rem 0;
    padding-left: 1rem;
    border-left: 2px solid var(--line-strong);
    color: var(--ink-muted);
  }
  ul, ol { margin: 0 0 1rem; padding-left: 1.4rem }
  li { margin-bottom: .35rem }
  code { font: .9em ui-monospace, monospace; background: var(--raised); padding: .1em .3em; border-radius: 3px }
  hr { border: 0; border-top: 1px solid var(--line); margin: 2.5rem 0 }
  a { color: var(--ink) }
  table { border-collapse: collapse; width: 100%; font-size: .9em; margin: 1rem 0 }
  th, td { border: 1px solid var(--line); padding: .4rem .6rem; text-align: left }

  /*
   * Everything below is drawn by the surface rather than written into a view,
   * which is why each is named apart from the vocabulary a generator is given.
   */

  .v-level {
    display: inline-block;
    margin-bottom: .5rem;
    padding: .1rem .45rem;
    border: 1px solid var(--line-strong);
    border-radius: 4px;
    font-family: ui-sans-serif, system-ui, "PingFang TC", sans-serif;
    font-size: .65rem;
    letter-spacing: .06em;
    text-transform: uppercase;
    color: var(--ink-subtle);
  }

  .v-write {
    display: block;
    width: 100%;
    margin: 0 0 .7rem;
    padding: .6rem .7rem;
    background: var(--canvas);
    border: 1px solid var(--line);
    border-radius: 6px;
    color: var(--ink);
    font: inherit;
    resize: vertical;
  }
  .v-write:disabled { color: var(--ink-muted) }

  /*
   * Where the score sits, once there is one.
   * Drawn only after a reader has answered something,
   * so nothing here has to explain itself before it has anything to say.
   */
  .v-top {
    position: sticky;
    top: 0;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    margin: -3.5rem -2.5rem 2.5rem;
    padding: .75rem 2.5rem;
    background: var(--canvas);
    border-bottom: 1px solid var(--line);
  }
  .v-tally { font-family: ui-sans-serif, system-ui, sans-serif; font-size: .75rem; color: var(--ink-subtle); white-space: nowrap }

  .v-step, .v-reveal {
    padding: .3rem .7rem;
    background: transparent;
    border: 1px solid var(--line-strong);
    border-radius: 999px;
    color: var(--ink-muted);
    font-family: ui-sans-serif, system-ui, "PingFang TC", sans-serif;
    font-size: .75rem;
    cursor: pointer;
    transition: background-color .12s, color .12s;
  }
  .v-step:hover, .v-reveal:hover { background: var(--raised); color: var(--ink) }
  .v-step:disabled { opacity: .35; cursor: default }
  .v-step:disabled:hover { background: transparent; color: var(--ink-muted) }
  .v-reveal { border-radius: 6px }

  .v-foot {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: .9rem;
    padding: .8rem 1rem;
    background: var(--surface);
    border-top: 1px solid var(--line);
  }
  .v-where { font-family: ui-sans-serif, system-ui, sans-serif; font-size: .75rem; color: var(--ink-subtle) }
  .v-dots { display: flex; gap: .35rem }
  .v-dot {
    width: .5rem;
    height: .5rem;
    padding: 0;
    background: transparent;
    border: 1px solid var(--line-strong);
    border-radius: 999px;
    cursor: pointer;
  }
  .v-dot.behind { background: var(--line-strong) }
  .v-dot.on { background: var(--ink); border-color: var(--ink) }

  body.has-foot { padding-bottom: 7rem }
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

/**
 * A fragment made into a page, set in this application's own colours,
 * and given the behaviour every written view shares.
 *
 * The script goes after the body rather than before it,
 * because it reads the markup it activates,
 * and nothing here waits for a document that is already parsed by then.
 */
export function pageAround(body: string, palette: string): string {
  return `<!doctype html><meta charset="utf-8">${palette}${VIEW_STYLE}<body>${body}</body>${VIEW_BEHAVIOUR}`
}
