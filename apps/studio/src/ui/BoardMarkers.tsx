import { useStore } from '@xyflow/react'
import type { EdgeStyle, MarkerKind } from '../lib/boardStyle.js'
import { growthAt, MARKER_TO_STROKE } from '../lib/boardStyle.js'
import { LINE_PAINTS } from '../lib/kinship.js'

const KINDS: readonly Exclude<MarkerKind, 'none'>[] = ['triangleHollow', 'diamond', 'arrow', 'dot']

// A relation drawn in its family's colour needs an end in that colour too,
// since an end in another colour would say it belongs somewhere else,
// so both are read off the one table.
const PAINTS: readonly (readonly [string, string])[] = [...LINE_PAINTS]

/**
 * What an edge points its end at, which is the bare id,
 * since the canvas wraps it in a reference itself,
 * and wrapping it here as well produces one nested inside another,
 * which resolves to nothing.
 *
 * The one place this name is spelled.
 * Defined under one name and asked for under another,
 * a mark is a line that quietly loses its end.
 */
function markerId(kind: Exclude<MarkerKind, 'none'>, paint: string): string {
  return `board-${kind}-${paint}`
}

/**
 * Which end of a line carries its mark.
 *
 * A class diagram stands the diamond against the whole,
 * and the hollow triangle against the general,
 * so a reader who has read one already knows which way to read these.
 *
 * Which way a line is drawn is the layout's business and moves with it.
 * A hierarchy runs from each child up to the root its siblings share,
 * and the same relation drawn without one runs the way it is written,
 * so the mark is placed by the root the relation declares,
 * rather than by the end the line happens to arrive at.
 *
 * A relation with no root points at what it reaches,
 * so its mark stays at the end it arrives by.
 */
export function markEnds(
  style: EdgeStyle,
  paint: string,
  ends: { readonly from: string, readonly to: string },
  drawnTowards: string,
): { markerStart?: string, markerEnd?: string } {
  if (style.marker === 'none')
    return {}
  const mark = markerId(style.marker, paint)
  const root = style.rootAt === 'from'
    ? ends.from
    : style.rootAt === 'to' ? ends.to : undefined
  return root !== undefined && root !== drawnTowards
    ? { markerStart: mark }
    : { markerEnd: mark }
}

/**
 * The ends a relation can be drawn with.
 * A hollow triangle and a diamond mean what they mean in a class diagram,
 * so a reader who has read one already knows which way an is-a points.
 * They are defined once for the document rather than once per edge,
 * which is the point of an SVG marker.
 *
 * An end is held against the canvas scale on the same terms as its line.
 * Left to shrink alone it becomes a speck on a line still clearly drawn,
 * and which way a relation runs is the first thing lost.
 */
export function BoardMarkers({ weight }: {
  /**
   * The weight of the lines these ends terminate,
   * which is what they are sized against. A surface says its own,
   * since a board and a survey do not share one.
   */
  weight: number
}): React.JSX.Element {
  const growth = growthAt(useStore(state => state.transform[2]))
  const size = weight * MARKER_TO_STROKE * growth

  return (
    <svg className="pointer-events-none absolute size-0" aria-hidden>
      <defs>
        {KINDS.flatMap(kind => PAINTS.map(([paint, colour]) => (
          <marker
            key={`${kind}-${paint}`}
            id={markerId(kind, paint)}
            viewBox="0 0 12 12"
            // Every end stands just outside the border it points at.
            // Centred on it instead,
            // the dot was cut in half by the card drawn over it.
            refX={kind === 'dot' ? 9 : 11}
            refY={6}
            markerWidth={size}
            markerHeight={size}
            orient="auto-start-reverse"
            markerUnits="userSpaceOnUse"
          >
            {markerShape(kind, colour)}
          </marker>
        )))}
      </defs>
    </svg>
  )
}

/**
 * One end, drawn in a twelve by twelve box.
 * Shared with whatever has to show a reader what an end looks like,
 * away from the canvas that defines it,
 * so a legend and the thing it is a legend for cannot come apart.
 */
export function markerShape(kind: Exclude<MarkerKind, 'none'>, colour: string): React.JSX.Element {
  switch (kind) {
    case 'triangleHollow':
      return <path d="M1 1 L11 6 L1 11 z" fill="var(--surface)" stroke={colour} strokeWidth={1.4} />
    case 'diamond':
      return <path d="M0 6 L6 1.5 L12 6 L6 10.5 z" fill={colour} stroke={colour} strokeWidth={1} strokeLinejoin="round" />
    // Filled, and closed. Drawn as two strokes meeting at a point,
    // it read as a scratch beside the line rather than as the end of it.
    case 'arrow':
      return <path d="M1.5 1.5 L11.5 6 L1.5 10.5 z" fill={colour} stroke={colour} strokeWidth={1} strokeLinejoin="round" />
    case 'dot':
      return <circle cx={6} cy={6} r={3} fill={colour} />
    default: {
      const exhaustive: never = kind
      throw new Error(`Unhandled marker: ${JSON.stringify(exhaustive)}`)
    }
  }
}
