export interface Related {
  readonly from: string
  readonly to: string
  readonly id: string
}

export interface Neighbourhood {
  /** The selection and everything one relation away from it, selection included. */
  readonly nodes: ReadonlySet<string>
  /** The relations that touch the selection, either end. */
  readonly edges: ReadonlySet<string>
}

const NOWHERE: Neighbourhood = { nodes: new Set(), edges: new Set() }

/**
 * One relation out from what a reader picked.
 * The selection is in the set, so a caller writes `nodes.has(id)` without
 * having to special-case the thing they picked. Nothing selected gives empty
 * sets rather than nothing, so a caller never has to check for absence twice.
 */
export function neighbourhood(
  selectedId: string | undefined,
  edges: readonly Related[],
): Neighbourhood {
  if (selectedId === undefined)
    return NOWHERE
  const nodes = new Set([selectedId])
  const touching = new Set<string>()
  for (const edge of edges) {
    if (edge.from !== selectedId && edge.to !== selectedId)
      continue
    touching.add(edge.id)
    nodes.add(edge.from)
    nodes.add(edge.to)
  }
  return { nodes, edges: touching }
}

/** What a reader is attending to, which is a selection and how hard they meant it. */
export interface Attention {
  readonly selectedId: string | undefined
  /**
   * Whether the rest of the board should be got out of the way entirely.
   * Picking something dims the rest, asking to focus removes it, and keeping
   * those apart is what lets a reader glance without losing their place.
   */
  readonly focused: boolean
}

export type Emphasis = 'plain' | 'dimmed' | 'gone'

export const IDLE: Attention = { selectedId: undefined, focused: false }

/**
 * How prominent one thing should be, given what a reader is attending to.
 * Written once for nodes and relations alike, since the rule is the same and
 * only the set it is asked about differs.
 */
export function emphasisOf(
  id: string,
  within: ReadonlySet<string>,
  attention: Attention,
): Emphasis {
  if (attention.selectedId === undefined || within.has(id))
    return 'plain'
  return attention.focused ? 'gone' : 'dimmed'
}

/** What is left once whatever a reader wanted out of the way has gone. */
export function remaining<T>(
  things: readonly T[],
  idOf: (thing: T) => string,
  within: ReadonlySet<string>,
  attention: Attention,
): T[] {
  return things.filter(thing => emphasisOf(idOf(thing), within, attention) !== 'gone')
}
