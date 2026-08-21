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

/** Where a line is drawn, or whether the arrangement says it instead. */
export type EdgeShown =
  /** Always drawn, because position cannot say it. */
  | 'always'
  /** Drawn while one of its ends is selected, because position already says it. */
  | 'onSelect'
  /** Never drawn on a board, because it is read inside a card instead. */
  | 'never'

/**
 * How a relation is shaped when it is drawn.
 * Kinds of a thing hang off a shared trunk, parts of a thing are bracketed
 * under it, and everything else is a curve between two cards.
 */
export type EdgeKin = 'family' | 'brood' | 'curve'

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
   * Whether this relation decides where things go, or is only drawn.
   * A relation that places nothing leaves both its ends free, and a layout
   * scatters what is free to fill the room the rest of the graph needs.
   */
  readonly shapes: 'layout' | 'drawn'
  readonly kin: EdgeKin
  readonly tone: EdgeTone
  readonly strokeWidth: number
  readonly dash?: string
  readonly marker: MarkerKind
  readonly shown: EdgeShown
}

export const TONE_COLOURS: Readonly<Record<EdgeTone, string>> = {
  structure: 'var(--edge)',
  quiet: 'var(--edge-quiet)',
  supports: 'var(--supports)',
  contradicts: 'var(--contradicts)',
}

/**
 * The width of every card, whatever it holds.
 * Wide enough to be worth looking at without opening it, and shared by every
 * kind so that a column of cards begins and ends on the same two lines.
 */
const CARD_WIDTH = 320

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
  // Kinds of a thing, drawn as a family tree, one trunk shared by the siblings.
  // A hollow triangle points at the parent, the way a class diagram points at
  // what a subclass generalizes.
  extends: { shapes: 'layout', kin: 'family', tone: 'structure', strokeWidth: 1.75, marker: 'triangleHollow', shown: 'always' },
  instantiates: { shapes: 'layout', kin: 'family', tone: 'structure', strokeWidth: 1.75, dash: '6 4', marker: 'triangleHollow', shown: 'always' },

  // Parts of a thing. A part is inside the whole rather than a kind of it, so
  // the parts are bracketed under it instead of hanging off a tree, which is
  // what tells this apart from a kind at a glance.
  contains: { shapes: 'layout', kin: 'brood', tone: 'structure', strokeWidth: 1.75, marker: 'diamond', shown: 'always' },

  // How much a curve claims is how solid it is drawn. A named dependency
  // asserts that one thing needs another, so it is solid and points.
  uses: { shapes: 'layout', kin: 'curve', tone: 'structure', strokeWidth: 1.5, marker: 'arrow', shown: 'always' },
  // The catch-all asserts only that something is there, so it is faint and
  // says nothing about which way it runs.
  relatesTo: { shapes: 'drawn', kin: 'curve', tone: 'quiet', strokeWidth: 1, dash: '1 4', marker: 'none', shown: 'always' },

  // Filing is the section a card sits in, so drawing it would repeat the board.
  belongsTo: { shapes: 'drawn', kin: 'curve', tone: 'quiet', strokeWidth: 1, dash: '2 4', marker: 'none', shown: 'never' },

  // Provenance, aboutness, and argument are all about a concept rather than
  // between two, so they are read inside the concept and never drawn out here.
  introduces: { shapes: 'drawn', kin: 'curve', tone: 'quiet', strokeWidth: 1, marker: 'none', shown: 'never' },
  concerns: { shapes: 'drawn', kin: 'curve', tone: 'structure', strokeWidth: 1, marker: 'dot', shown: 'never' },
  supports: { shapes: 'drawn', kin: 'curve', tone: 'supports', strokeWidth: 1.5, marker: 'arrow', shown: 'never' },
  contradicts: { shapes: 'drawn', kin: 'curve', tone: 'contradicts', strokeWidth: 1.5, dash: '5 3', marker: 'arrow', shown: 'never' },
}

const UNKNOWN_EDGE: EdgeStyle = {
  shapes: 'drawn',
  kin: 'curve',
  tone: 'quiet',
  strokeWidth: 1,
  marker: 'arrow',
  shown: 'always',
}

/** An edge type the ontology adds is still drawn, quietly, rather than dropped. */
export function edgeStyle(typeId: string): EdgeStyle {
  return EDGE_STYLES[typeId] ?? UNKNOWN_EDGE
}
