import { edgeStyle, TONE_COLOURS } from './boardStyle.js'
import type { Note } from './drawing.js'
import type { GraphEdge, GraphNode } from './graph.js'

/** What a card hangs off, said on the card so it need not be traced. */
export interface Lineage {
  readonly parentId: string
  readonly type: string
}

/**
 * Which relation a card names first when it names more than one.
 * Being part of something places a card, and being a kind of it does not,
 * so it leads, and the rest follow in the order the ontology declares them.
 */
const NAMED_FIRST = ['contains', 'extends', 'instantiates']

/**
 * What each card hangs off, and how, all of it.
 * A card can be part of one thing and a kind of another,
 * and naming only the first leaves the second with nowhere to be said at all.
 * A colour says which family a card is in but not which card it answers to,
 * and a line says that only to a reader willing to follow it,
 * so the card carries the answer too.
 */
export function lineages(edges: readonly GraphEdge[]): Map<string, Lineage[]> {
  const held = new Map<string, Lineage[]>()
  for (const edge of edges) {
    const style = edgeStyle(edge.type)
    if (style.kin !== 'tree')
      continue
    const [parentId, child] = style.rootAt === 'from'
      ? [edge.fromNodeId, edge.toNodeId]
      : [edge.toNodeId, edge.fromNodeId]
    held.set(child, [...(held.get(child) ?? []), { parentId, type: edge.type }])
  }

  for (const [child, all] of held) {
    held.set(child, [...all].sort((one, other) =>
      rankOf(one.type) - rankOf(other.type) || one.parentId.localeCompare(other.parentId)))
  }
  return held
}

function rankOf(type: string): number {
  const rank = NAMED_FIRST.indexOf(type)
  return rank === -1 ? NAMED_FIRST.length : rank
}

/**
 * How a relation reads when a card says it rather than the board drawing it.
 * A relation reads one way from one end and the other way from the other,
 * so both are written down.
 * Anything the ontology adds that is not here is read off its own name,
 * which is the honest answer for a relation nobody has chosen words for yet.
 */
const SAID_AS: Readonly<Record<string, { readonly from: string, readonly to: string }>> = {
  uses: { from: 'Uses', to: 'Used by' },
  relatesTo: { from: 'Related to', to: 'Related to' },
  belongsTo: { from: 'Filed under', to: 'Holds' },
  contains: { from: 'Contains', to: 'Part of' },
  extends: { from: 'Kind of', to: 'Kinds include' },
  instantiates: { from: 'Kind of', to: 'Kinds include' },
  concerns: { from: 'About', to: 'Spoken about by' },
  introduces: { from: 'Introduces', to: 'Introduced by' },
  supports: { from: 'Supports', to: 'Supported by' },
  contradicts: { from: 'Contradicts', to: 'Contradicted by' },
}

/**
 * How a relation reads from one of its ends, in words.
 * Every surface that spells a relation out asks here,
 * so a card and the panel beside it never call the same relation two things.
 */
export function saidAs(type: string, end: 'from' | 'to'): string {
  return SAID_AS[type]?.[end] ?? asWords(type)
}

/**
 * The same shapes the lines end in, so one vocabulary says one thing.
 * A relation the board could not draw carries none,
 * since there is no line whose end a mark could be echoing.
 */
const PART_OF = '\u25C6'
const KIND_OF = '\u25B7'

/** One thing a card says about itself, and everything it says it about. */
export interface Said {
  readonly phrase: string
  readonly names: readonly string[]
  readonly glyph?: string
  readonly colour?: string
}

/** One way of saying something, and the one card it is being said about. */
type SaidOnce = Omit<Said, 'names'> & { readonly name: string }

/**
 * One row for each way of saying something, naming everything it is said about.
 * A card that is part of two things says so once and names both,
 * since three rows opening on the same two words is a list read twice,
 * to find out it was one thing all along.
 *
 * Rows worn in different colours stay apart under the same words,
 * because the colour is saying which family, which the words are not.
 */
export function gatheredSaid(rows: readonly SaidOnce[]): Said[] {
  const gathered = new Map<string, Said>()
  for (const { name, ...row } of rows) {
    const key = `${row.phrase}|${row.colour ?? ''}`
    const already = gathered.get(key)
    gathered.set(key, already === undefined
      ? { ...row, names: [name] }
      : { ...already, names: [...already.names, name] })
  }
  return [...gathered.values()]
}

/**
 * Everything a card says about itself, gathered by how it says it.
 *
 * What the board drew and what it could not are said in the same place.
 * They are the same kind of statement about the same card,
 * and putting the second in a footer of its own made the board look wrong,
 * as though it held two sorts of card.
 */
export function saidOnCard(
  held: readonly Lineage[],
  notes: readonly Note[],
  byId: ReadonlyMap<string, GraphNode>,
  colourOf: (parentId: string) => string,
): Said[] {
  const named = (id: string): string => byId.get(id)?.name ?? id
  return gatheredSaid([
    ...held.map(lineage => ({
      phrase: lineage.type === 'contains' ? 'Part of' : 'Kind of',
      glyph: lineage.type === 'contains' ? PART_OF : KIND_OF,
      colour: colourOf(lineage.parentId),
      name: named(lineage.parentId),
    })),
    ...notes.map(note => ({
      phrase: saidAs(note.type, note.end),
      name: named(note.otherId),
    })),
  ])
}

/** A type read off its own name, so an unnamed relation still says one. */
function asWords(type: string): string {
  const spaced = type.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase()
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

/**
 * What a card wears when it belongs to nothing. Neutral rather than a colour,
 * so a colour always means membership,
 * and never has to be told apart from a card that has no family at all.
 */
export const NO_FAMILY = 'kin-none'

/**
 * The colours a family can be drawn in.
 * Which colour a family gets means nothing, only that two families differ.
 * Kept clear of the green and red that agreement and conflict own.
 */
export const FAMILY_COLOURS: readonly string[] = [
  'kin-1',
  'kin-2',
  'kin-3',
  'kin-4',
  'kin-5',
  'kin-6',
]

/** Every colour a card or a line can be drawn in for belonging to something. */
export const KINSHIP_KEYS: readonly string[] = [...FAMILY_COLOURS, NO_FAMILY]

/** A key names a colour rather than being one, so a marker can be cut. */
export function kinColour(key: string): string {
  return `var(--${key})`
}

/**
 * Every colour a line can be drawn in, under the key the line asks for it by.
 * A line takes its colour from the family it belongs to when it has one,
 * and from the kind of relation it is when it does not,
 * and the end it points with is cut from the same table,
 * so both have to be answered from one place.
 * Read from the kinship table alone,
 * a tone's name gives back a variable no stylesheet defines,
 * and the line disappears while its end stays.
 */
export const LINE_PAINTS: ReadonlyMap<string, string> = new Map([
  ...Object.entries(TONE_COLOURS),
  ...KINSHIP_KEYS.map(key => [key, kinColour(key)] as const),
])

/** The colour a line drawn under this key takes. */
export function lineColour(key: string): string {
  return LINE_PAINTS.get(key) ?? kinColour(NO_FAMILY)
}

/**
 * Which family each card belongs to, and what colour that family wears.
 * A whiteboard is looked at rather than read,
 * so belonging is said in colour and in where a card sits,
 * not in a line a reader has to trace or a sentence they read off the card.
 *
 * A card in no family gets nothing,
 * so the colour means membership rather than decorating every card equally.
 */
export function familyColours(edges: readonly GraphEdge[]): Map<string, string> {
  return worthWearing(edges).byNode
}

/**
 * What the family led by each card wears.
 * A relation belongs to the family its parent leads,
 * not to the one its child leads, and a middle card leads one of its own,
 * so asking the child gives the wrong answer for the line that reaches it.
 */
export function familyOfRoot(edges: readonly GraphEdge[]): Map<string, string> {
  return worthWearing(edges).byRoot
}

function worthWearing(edges: readonly GraphEdge[]): {
  byNode: Map<string, string>
  byRoot: Map<string, string>
} {
  // Taken from the same choice a card writes on itself,
  // since a card wearing one family and naming another says two things,
  // and settles neither.
  const rootOf = new Map<string, string>()
  for (const [child, all] of lineages(edges)) {
    for (const lineage of all)
      rootOf.set(lineage.parentId, lineage.parentId)
    rootOf.set(child, all[0]!.parentId)
  }

  // A colour worn by one card alone announces a group that is not there.
  const wearers = new Map<string, number>()
  for (const root of rootOf.values())
    wearers.set(root, (wearers.get(root) ?? 0) + 1)

  // Sorted, so the same graph wears the same colours every time it is opened.
  const roots = [...wearers].filter(([, count]) => count > 1).map(([root]) => root).sort()
  const worn = new Map(roots.map((root, index) =>
    [root, FAMILY_COLOURS[index % FAMILY_COLOURS.length]!]))

  return {
    byNode: new Map([...rootOf]
      .filter(([, root]) => worn.has(root))
      .map(([id, root]) => [id, worn.get(root)!])),
    byRoot: worn,
  }
}
