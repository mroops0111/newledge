/**
 * How a board draws each type the ontology declares.
 * This is the whole visual language in one place, as plain data, so a reader
 * can later be handed an override of it without any drawing code changing.
 */

/** What kind of thing a node is drawn as, which follows from what it is. */
export type NodeForm =
  /** A term you think with, so a title over a definition. */
  | 'concept'
  /** An assertion, which is a sentence rather than a term, so no title. */
  | 'claim'
  /** Provenance, drawn as a link you can open rather than as a thought. */
  | 'source'
  /** A container, drawn as ground when it is a section and small as a card. */
  | 'topic'

export interface NodeStyle {
  readonly form: NodeForm
  readonly width: number
  /** A topic becomes a section on the board, and a card only if asked for. */
  readonly ground: boolean
}

/** Where a line is drawn, or whether the arrangement says it instead. */
export type EdgeShown =
  /** Always drawn, because position cannot say it. */
  | 'always'
  /** Drawn while one of its ends is selected, because position already says it. */
  | 'onSelect'

/**
 * What a relation is, said in colour.
 * Agreement and conflict are the two things a line has to carry at a glance,
 * so they are the only relations given a colour of their own.
 */
export type EdgeTone = 'structure' | 'quiet' | 'supports' | 'contradicts'

/** UML says what these mean, so a reader who knows a diagram knows these. */
export type MarkerKind = 'triangleHollow' | 'diamond' | 'arrow' | 'dot' | 'none'

export interface EdgeStyle {
  /**
   * Orthogonal for classification, which should read as a diagram,
   * and a curve for argument and aboutness, which should read as thinking.
   */
  readonly routing: 'step' | 'curve'
  readonly tone: EdgeTone
  readonly strokeWidth: number
  readonly dash?: string
  readonly marker: MarkerKind
  readonly shown: EdgeShown
}

export const TONE_COLOURS: Readonly<Record<EdgeTone, string>> = {
  structure: 'var(--line-strong)',
  quiet: 'var(--ink-subtle)',
  supports: 'var(--supports)',
  contradicts: 'var(--contradicts)',
}

const CARD_WIDTH = 240

export const NODE_STYLES: Readonly<Record<string, NodeStyle>> = {
  Concept: { form: 'concept', width: CARD_WIDTH, ground: false },
  Claim: { form: 'claim', width: CARD_WIDTH, ground: false },
  Source: { form: 'source', width: CARD_WIDTH, ground: false },
  Topic: { form: 'topic', width: 190, ground: true },
}

const UNKNOWN_NODE: NodeStyle = { form: 'concept', width: CARD_WIDTH, ground: false }

/** A type the ontology adds is still drawn, as the default form. */
export function nodeStyle(typeId: string): NodeStyle {
  return NODE_STYLES[typeId] ?? UNKNOWN_NODE
}

export const EDGE_STYLES: Readonly<Record<string, EdgeStyle>> = {
  // Classification, drawn the way a class diagram draws it.
  extends: { routing: 'step', tone: 'structure', strokeWidth: 1.5, marker: 'triangleHollow', shown: 'always' },
  instantiates: { routing: 'step', tone: 'structure', strokeWidth: 1.5, dash: '6 4', marker: 'triangleHollow', shown: 'always' },
  uses: { routing: 'step', tone: 'structure', strokeWidth: 1, marker: 'arrow', shown: 'always' },

  // Structure a reader can see in the arrangement, so drawing it as well
  // would only repeat what the layout already said.
  contains: { routing: 'step', tone: 'structure', strokeWidth: 1.5, marker: 'diamond', shown: 'onSelect' },
  belongsTo: { routing: 'step', tone: 'quiet', strokeWidth: 1, dash: '2 4', marker: 'none', shown: 'onSelect' },

  // The catch-all, and provenance, both kept quiet until asked for.
  relatesTo: { routing: 'curve', tone: 'quiet', strokeWidth: 1, dash: '2 4', marker: 'none', shown: 'onSelect' },
  introduces: { routing: 'curve', tone: 'quiet', strokeWidth: 0.75, dash: '1 5', marker: 'none', shown: 'onSelect' },

  // What a claim is about puts it in that concept's section, so the line is
  // held back too, and asking about one concept is what gathers its claims.
  concerns: { routing: 'curve', tone: 'structure', strokeWidth: 1, marker: 'dot', shown: 'onSelect' },

  // Argument, which no arrangement can express. Two claims that disagree may
  // sit anywhere, so the only way to see the disagreement is to draw it.
  supports: { routing: 'curve', tone: 'supports', strokeWidth: 1.5, marker: 'arrow', shown: 'always' },
  contradicts: { routing: 'curve', tone: 'contradicts', strokeWidth: 1.5, dash: '5 3', marker: 'arrow', shown: 'always' },
}

const UNKNOWN_EDGE: EdgeStyle = {
  routing: 'curve',
  tone: 'quiet',
  strokeWidth: 1,
  marker: 'arrow',
  shown: 'always',
}

/** An edge type the ontology adds is still drawn, quietly, rather than dropped. */
export function edgeStyle(typeId: string): EdgeStyle {
  return EDGE_STYLES[typeId] ?? UNKNOWN_EDGE
}
