import { LEVELS } from './forms.js'

/**
 * What is wrong with a written page, checked rather than promised.
 *
 * A skill's completion checklist is the agent's own account of its work,
 * which is worth having and is not evidence.
 * An agent that wrote a question with no answer behind it,
 * ticks the box saying every answer is there,
 * because it believes it, and nothing has looked.
 *
 * So the contract the reference states is stated again here as a function.
 * The reference is what an agent reads, this is what a reader is protected by,
 * and the two saying the same thing is what the drift test is for.
 *
 * This reads markup with regular expressions rather than a parser,
 * because it runs where there is no DOM and the vocabulary is shallow,
 * a handful of flat classes with no nesting of their own kind.
 * It is deliberately blind to what it cannot see that way,
 * so every rule below is one that holds on a flat reading.
 */

/** One thing wrong with a page, said the way it has to be fixed. */
export interface Problem {
  /** What was looked at, named as a writer would find it. */
  readonly at: string
  /** What is wrong, and what to do, in one sentence. */
  readonly said: string
}

const KNOWN_LEVELS = new Set(LEVELS.map(level => level.id))

/**
 * What a fragment may not carry, and what to do about each.
 *
 * One table rather than a run of conditions,
 * so forbidding a fifth thing is an entry rather than another branch,
 * and so the reference and this cannot come to disagree,
 * about how many there are.
 */
const FORBIDDEN: readonly { readonly found: RegExp, readonly said: string }[] = [
  {
    found: /^\s*<(?:!doctype\s+html|html[\s>])/i,
    said: 'A whole document arrived where a fragment was asked for. Drop the doctype, html, head, and body.',
  },
  {
    found: /<style[\s>]/i,
    said: 'A style block is here. The surface reading this owns how it looks.',
  },
  {
    found: /<script[\s>]/i,
    said: 'A script is here. The surface reading this owns how it behaves.',
  },
  {
    found: /<details[\s>]/i,
    said: 'A details element is here. Put the answer in a div with class answer and the surface hides it.',
  },
]

/**
 * Text a reader would see, with markup and entities out of the way.
 * A page whose question is an empty paragraph reads as written and is not,
 * so what counts is what is left once the tags are gone.
 */
function spoken(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Every element carrying a class, from its opening tag to its closing one.
 *
 * The opening tag is kept rather than trimmed away,
 * because what a question tests and which option is right are attributes on it,
 * and a reading that starts after the tag cannot see either.
 */
function taggedWith(html: string, className: string): readonly string[] {
  const opens = new RegExp(`<(\\w+)[^>]*\\bclass="[^"]*\\b${className}\\b[^"]*"[^>]*>`, 'gi')
  const found: string[] = []
  for (const match of html.matchAll(opens)) {
    const tag = match[1]!
    const at = match.index ?? 0
    // The vocabulary nests nothing inside its own kind,
    // so the first closing tag of the same name is this one's.
    const closes = new RegExp(`</${tag}>`, 'gi')
    closes.lastIndex = at + match[0].length
    const end = closes.exec(html)
    found.push(html.slice(at, end === null ? html.length : end.index + end[0].length))
  }
  return found
}

/** How a page names the thing a problem is about, out of what it holds. */
function shortly(html: string): string {
  const said = spoken(html)
  return said.length > 60 ? `${said.slice(0, 57)}...` : said || '(empty)'
}

/**
 * The contract a fragment is written to, checked against what arrived.
 *
 * Every rule here is one an agent can act on without being told twice,
 * because a report a writer cannot use is one they will overwrite blindly.
 */
export function problemsIn(html: string): readonly Problem[] {
  const problems: Problem[] = []
  const say = (at: string, said: string): void => { problems.push({ at, said }) }

  for (const banned of FORBIDDEN) {
    if (banned.found.test(html))
      say('the page', banned.said)
  }

  if (spoken(html) === '')
    say('the page', 'Nothing was written.')

  for (const chapter of taggedWith(html, 'chapter')) {
    if (!/<h2[\s>]/i.test(chapter))
      say(`chapter "${shortly(chapter)}"`, 'A chapter opens with an h2 a reader could pick out of a list.')
    if (spoken(chapter).length < 40)
      say(`chapter "${shortly(chapter)}"`, 'A chapter holding almost nothing is a heading, not a step. Write it or drop it.')
  }

  const questions = taggedWith(html, 'question')
  for (const question of questions)
    problems.push(...problemsInQuestion(question))
  problems.push(...problemsAcrossChoices(questions))

  for (const source of taggedWith(html, 'source')) {
    if (!/<a\s[^>]*href="[^"]+"/i.test(source))
      say(`source "${shortly(source)}"`, 'A source is where a reader goes to check, so it carries a link.')
  }

  return problems
}

/** Where the right answer sat, and how long it was against the rest. */
interface Told {
  readonly at: number
  readonly longest: boolean
}

function toldBy(question: string): Told | undefined {
  const choices = taggedWith(question, 'choice')
  const at = choices.findIndex(choice => /\bdata-correct\b/.test(choice))
  if (at === -1)
    return undefined
  // Strictly longer than every other, since options of one length,
  // tell nobody anything, and a tie is what keeping them alike,
  // looks like when it worked.
  const lengths = choices.map(choice => spoken(choice).length)
  const mine = lengths[at]!
  return { at, longest: lengths.every((other, index) => index === at || other < mine) }
}

/**
 * What a reader learns from the shape of the options rather than the subject.
 *
 * A generator writes one question at a time and cannot see the page,
 * so it puts the answer first and writes it longer than the rest.
 * The true statement is the one it is thinking about,
 * and the one carrying the qualifications.
 * Neither shows up while writing, and both are obvious to a reader,
 * who scores well without knowing anything and reads that as knowing it.
 *
 * These are the two tells item-writing guidance keeps warning about,
 * and the only two a page can be checked for without a class to sit it.
 */
function problemsAcrossChoices(questions: readonly string[]): readonly Problem[] {
  const told = questions.map(toldBy).filter((one): one is Told => one !== undefined)
  if (told.length < 3)
    return []

  const problems: Problem[] = []
  const places = new Set(told.map(one => one.at))
  if (places.size === 1) {
    problems.push({
      at: 'the options across the page',
      said: `Every right answer is option ${told[0]!.at + 1}. Move them about, or a reader scores full marks by picking that one every time.`,
    })
  }

  const longest = told.filter(one => one.longest).length
  if (told.length >= 5 && longest * 5 > told.length * 3) {
    problems.push({
      at: 'the options across the page',
      said: `The right answer is the longest option in ${longest} of ${told.length}. Cut it back or draw the others out, or its length is the answer.`,
    })
  }

  return problems
}

function problemsInQuestion(question: string): readonly Problem[] {
  const problems: Problem[] = []
  const named = `question "${shortly(question)}"`
  const say = (said: string): void => { problems.push({ at: named, said }) }

  const asks = taggedWith(question, 'ask')
  if (asks.length === 0)
    say('There is no ask here. The question itself goes in a paragraph with class ask.')
  else if (asks.length > 1)
    say('There is more than one ask here. A question asks one thing.')
  else if (spoken(asks[0]!) === '')
    say('The ask is empty.')

  const level = /\bdata-level="([^"]*)"/i.exec(question)?.[1]
  if (level === undefined)
    say('This says nothing about what it tests. Put data-level on it.')
  else if (!KNOWN_LEVELS.has(level))
    say(`"${level}" is not a level. Use ${[...KNOWN_LEVELS].join(', ')}.`)

  const answers = taggedWith(question, 'answer')
  if (answers.length === 0)
    say('There is no answer behind this. A question a reader cannot check teaches nothing.')
  else if (spoken(answers[0]!) === '')
    say('The answer is empty.')

  const choices = taggedWith(question, 'choice')
  if (choices.length > 0) {
    if (choices.length < 2)
      say('One option is not a choice. Offer at least two, or drop the options and let the reader write.')
    const correct = (question.match(/\bdata-correct\b/g) ?? []).length
    if (correct === 0)
      say('No option is marked correct. Put data-correct on exactly one.')
    else if (correct > 1)
      say(`${correct} options are marked correct. Exactly one is.`)
    if (choices.some(one => spoken(one) === ''))
      say('An option is empty.')
  }

  return problems
}
