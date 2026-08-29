/**
 * The forms a board can be written in, and what each one asks before writing.
 *
 * Declared once, here, because three places need the same list.
 * A route refuses an unknown form before it reaches the runner,
 * a surface offers a reader the forms and whatever each one asks,
 * and the plugin ships one skill per form.
 * Three copies of a list drift the moment a fourth form is added.
 *
 * Nothing in this file imports braid or the DOM,
 * so the browser and the runtime can both read it.
 */

/** One answer a reader may give to what a form asks. */
export interface Choice {
  readonly id: string
  readonly label: string
  /** What picking this gets them, said in the terms they would ask for it in. */
  readonly why: string
}

/**
 * One thing a form asks before it is written.
 *
 * A view is not obliged to be a fixed thing.
 * What a reader wants from an exam at the start of learning a subject,
 * and what they want the night before they have to use it,
 * are different documents out of the same material,
 * and the difference is worth asking for rather than guessing at.
 */
export interface Ask {
  readonly id: string
  readonly label: string
  readonly choices: readonly Choice[]
  /** What is written when a reader says nothing, which is the common case. */
  readonly fallback: string
}

/**
 * A way of writing the graph out, and what each one is for.
 *
 * They are peers rather than steps.
 * Which one a reader wants follows from what they are about to do,
 * not from how far along they are.
 */
export interface Form {
  readonly id: string
  readonly label: string
  /** What a reader gets, said in the terms they would ask for it in. */
  readonly purpose: string
  readonly asks: readonly Ask[]
}

/**
 * How hard the questions are, which is the axis a reader moves along.
 *
 * The three are not degrees of the same question.
 * Recall asks what the material said, apply asks what follows from it,
 * and judgement asks what would settle something the material left open,
 * so each tests a different thing rather than the same thing harder.
 *
 * Named separately from the ask that offers them,
 * because a written page carries one of these on every question,
 * and the surface reading it names them back to the reader.
 * Two lists of the same three drift the moment a fourth is wanted.
 */
export const LEVELS: readonly Choice[] = [
  { id: 'recall', label: 'Recall', why: 'What the material said, asked back' },
  { id: 'apply', label: 'Apply', why: 'What follows from it, and how the parts stand together' },
  { id: 'judge', label: 'Judgement', why: 'What would settle what the sources left open' },
]

const LEVEL: Ask = {
  id: 'level',
  label: 'Difficulty',
  fallback: 'mixed',
  choices: [
    ...LEVELS,
    { id: 'mixed', label: 'Mixed', why: 'All three, in rising order' },
  ],
}

const KINDS: Ask = {
  id: 'kinds',
  label: 'Question type',
  fallback: 'mixed',
  choices: [
    { id: 'choice', label: 'Multiple choice', why: 'Quick, and marked as you go' },
    { id: 'written', label: 'Written', why: 'You produce the answer before seeing it' },
    { id: 'mixed', label: 'Mixed', why: 'Choice to warm up, written where it matters' },
  ],
}

const LENGTH: Ask = {
  id: 'length',
  label: 'Length',
  fallback: 'standard',
  choices: [
    { id: 'quick', label: 'Quick', why: 'Around five questions, for a spot check' },
    { id: 'standard', label: 'Standard', why: 'Around a dozen, covering every term' },
    { id: 'thorough', label: 'Thorough', why: 'Every claim the board holds gets asked' },
  ],
}

const DEPTH: Ask = {
  id: 'depth',
  label: 'Depth',
  fallback: 'standard',
  choices: [
    { id: 'plain', label: 'Plain', why: 'No prior knowledge assumed, and no jargon kept' },
    { id: 'standard', label: 'Standard', why: 'For someone comfortable in the neighbouring field' },
    { id: 'deep', label: 'Deep', why: 'The disagreements and the edges, not just the shape' },
  ],
}

const RUNTIME: Ask = {
  id: 'runtime',
  label: 'Time on stage',
  fallback: 'standard',
  choices: [
    { id: 'lightning', label: 'Five minutes', why: 'The one idea and what it is good for' },
    { id: 'standard', label: 'Fifteen minutes', why: 'The shape of the subject, with a page per term' },
    { id: 'full', label: 'Forty minutes', why: 'Room for the evidence and the open questions' },
  ],
}

/**
 * Every form is written out of a board, which is the whole of the split.
 *
 * A board is the only thing carrying both what a view is about,
 * and the order it is read in, which the graph cannot supply.
 * So a reader arranges and then writes it out,
 * and there is one place to do either.
 *
 * A reference asks nothing.
 * A reader looking something up wants the same document every time,
 * because a lookup they have to configure is one they will not make.
 */
export const FORMS: readonly Form[] = [
  {
    id: 'reference',
    label: 'Reference',
    purpose: 'Arranged to be scanned, for coming back and finding one thing',
    asks: [],
  },
  {
    id: 'tutorial',
    label: 'Tutorial',
    purpose: 'Written for someone meeting the subject for the first time',
    asks: [DEPTH],
  },
  {
    id: 'exam',
    label: 'Exam',
    purpose: 'Questions that mark themselves, for finding out what stuck',
    asks: [LEVEL, KINDS, LENGTH],
  },
  {
    id: 'presentation',
    label: 'Presentation',
    purpose: 'Pages to stand in front of, for teaching the board to a room',
    asks: [RUNTIME],
  },
]

export function formOfId(id: string): Form | undefined {
  return FORMS.find(one => one.id === id)
}

/**
 * What a form was actually asked for, with anything unsaid filled in.
 *
 * A reader may answer none of it, and usually does,
 * so every ask carries what is written when they say nothing.
 * A value nobody offered is dropped rather than passed on,
 * because a skill handed a choice that is not in its vocabulary,
 * has no way to tell that from one it simply has not implemented.
 */
export function askedOf(form: Form, given: Readonly<Record<string, string>>): Record<string, string> {
  const asked: Record<string, string> = {}
  for (const ask of form.asks) {
    const said = given[ask.id]
    const known = ask.choices.some(choice => choice.id === said)
    asked[ask.id] = known && said !== undefined ? said : ask.fallback
  }
  return asked
}

/**
 * What a form was asked for, as the one string a skill run is handed.
 *
 * A run takes a single argument, so the material and the request share it.
 * They are kept apart rather than merged,
 * because the material is a projection of the graph and comes out the same,
 * every time, while the request is what this one reader wanted this once.
 */
export function argumentsFor(material: string, asked: Readonly<Record<string, string>>): string {
  const said = Object.entries(asked).map(([key, value]) => `${key}=${value}`)
  return [material, ...said].join(' ')
}
