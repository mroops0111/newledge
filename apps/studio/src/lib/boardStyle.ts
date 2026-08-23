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
  /**
   * How wide this kind is drawn **as a card**.
   * Every kind shares one, because a card is a card and a board is scanned by
   * reading down a column whose edges line up. A kind that is ground never
   * uses it at all, since a section is sized by what it holds.
   */
  readonly cardWidth: number
  /** A topic becomes a section on the board, and a card only if asked for. */
  readonly ground: boolean
  /**
   * Whether a board arranges this kind at all.
   * A board is for the things a reader thinks with. What is asserted about
   * one of them, and where that came from, belongs inside it rather than
   * beside it, so opening a concept is what shows them.
   */
  readonly placed: boolean
  /**
   * Which band of a section a kind sits in.
   * Kinds staying together is what makes a section readable rather than a bag,
   * so terms come before what is asserted about them, and provenance last.
   */
  readonly band: number
}

/**
 * How a relation is shaped.
 * A hierarchy hangs off a trunk its siblings share, and everything else runs
 * from one card to another.
 */
export type EdgeKin = 'tree' | 'curve'

/**
 * What a relation is, said in colour.
 * Agreement and conflict are the two things a line has to carry at a glance,
 * so they are the only relations given a colour of their own.
 */
export type EdgeTone = 'structure' | 'quiet' | 'supports' | 'contradicts'

/**
 * How thick every line is drawn.
 * Weight is a weak signal and three of them were being used alongside dash,
 * end, and shape, which is noise rather than another distinction. Heavy enough
 * to survive a board zoomed out, which is where most of a board is read.
 */
export const STROKE = 2.25

/** UML says what these mean, so a reader who knows a diagram knows these. */
export type MarkerKind = 'triangleHollow' | 'diamond' | 'arrow' | 'dot' | 'none'

export interface EdgeStyle {
  readonly kin: EdgeKin
  /**
   * Which end of a hierarchy is its root.
   * A whole contains its parts and a kind extends what it is a kind of, so
   * the two are written in opposite directions.
   */
  readonly rootAt?: 'from' | 'to'
  readonly tone: EdgeTone
  readonly strokeWidth: number
  readonly dash?: string
  readonly marker: MarkerKind
}

export const TONE_COLOURS: Readonly<Record<EdgeTone, string>> = {
  structure: 'var(--edge)',
  quiet: 'var(--edge-quiet)',
  supports: 'var(--supports)',
  contradicts: 'var(--contradicts)',
}

/**
 * The width of every card, whatever it holds.
 * Set to a reading measure, about 58 characters to the line, and shared by
 * every kind so that a column of cards begins and ends on the same two lines.
 */
const CARD_WIDTH = 400

export const NODE_STYLES: Readonly<Record<string, NodeStyle>> = {
  Concept: { form: 'concept', cardWidth: CARD_WIDTH, ground: false, band: 0, placed: true },
  Claim: { form: 'claim', cardWidth: CARD_WIDTH, ground: false, band: 1, placed: false },
  Source: { form: 'source', cardWidth: CARD_WIDTH, ground: false, band: 2, placed: false },
  Topic: { form: 'topic', cardWidth: CARD_WIDTH, ground: true, band: 0, placed: false },
}

const UNKNOWN_NODE: NodeStyle = { form: 'concept', cardWidth: CARD_WIDTH, ground: false, band: 3, placed: true }

/** A type the ontology adds is still drawn, as the default form. */
export function nodeStyle(typeId: string): NodeStyle {
  return NODE_STYLES[typeId] ?? UNKNOWN_NODE
}

export const EDGE_STYLES: Readonly<Record<string, EdgeStyle>> = {
  // A hierarchy. Which of the three it is comes from the end it carries and
  // from what the card says it hangs off, since both are read at a glance and
  // a trunk on its own is not.
  extends: { kin: 'tree', rootAt: 'to', tone: 'structure', strokeWidth: STROKE, marker: 'triangleHollow' },
  instantiates: { kin: 'tree', rootAt: 'to', tone: 'structure', strokeWidth: STROKE, dash: '6 4', marker: 'triangleHollow' },
  contains: { kin: 'tree', rootAt: 'from', tone: 'structure', strokeWidth: STROKE, marker: 'diamond' },

  // How solid a curve is drawn tracks how much it claims. A named dependency
  // says one thing needs another, so it is solid and points. The catch-all
  // says only that something is there, so it is faint and says no direction.
  uses: { kin: 'curve', tone: 'structure', strokeWidth: STROKE, marker: 'arrow' },
  relatesTo: { kin: 'curve', tone: 'quiet', strokeWidth: STROKE, dash: '1 4', marker: 'none' },

  // Filing a card under a topic is the section it sits in, and drawing that
  // repeats the board, which is caught by a relation whose end stands on its
  // other end. Filing a topic under a topic is not, so it is drawn, between
  // the two sections those topics are.
  belongsTo: { kin: 'curve', tone: 'quiet', strokeWidth: STROKE, dash: '2 4', marker: 'none' },

  // Provenance, aboutness, and argument. Whether any of them is drawn is
  // decided by where its two ends turn out to be, the same as every other
  // relation. Declared undrawable instead, a board that put claims and sources
  // on it as cards of their own gave them nothing at all to stand in.
  introduces: { kin: 'curve', tone: 'quiet', strokeWidth: STROKE, marker: 'none' },
  concerns: { kin: 'curve', tone: 'structure', strokeWidth: STROKE, marker: 'dot' },
  supports: { kin: 'curve', tone: 'supports', strokeWidth: STROKE, marker: 'arrow' },
  contradicts: { kin: 'curve', tone: 'contradicts', strokeWidth: STROKE, dash: '5 3', marker: 'arrow' },
}

const UNKNOWN_EDGE: EdgeStyle = {
  kin: 'curve',
  tone: 'quiet',
  strokeWidth: STROKE,
  marker: 'arrow',
}

/** An edge type the ontology adds is still drawn, quietly, rather than dropped. */
export function edgeStyle(typeId: string): EdgeStyle {
  return EDGE_STYLES[typeId] ?? UNKNOWN_EDGE
}
