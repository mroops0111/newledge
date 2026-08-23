import type { MarkerKind } from '../lib/boardStyle.js'
import { LINE_PAINTS } from '../lib/kinship.js'

const KINDS: readonly Exclude<MarkerKind, 'none'>[] = ['triangleHollow', 'diamond', 'arrow', 'dot']

// A relation drawn in the colour of the family it belongs to needs an end in
// that colour too, since an end in another colour would say it belongs
// somewhere else, so both are read off the one table.
const PAINTS: readonly (readonly [string, string])[] = [...LINE_PAINTS]

/**
 * What an edge points its end at, or nothing when it has no direction.
 * The bare id, since the canvas wraps it in a reference itself and wrapping it
 * here as well produces one nested inside another, which resolves to nothing.
 */
export function markerId(kind: MarkerKind, paint: string): string | undefined {
  return kind === 'none' ? undefined : `board-${kind}-${paint}`
}

/**
 * The ends a relation can be drawn with.
 * A hollow triangle and a diamond mean what they mean in a class diagram, so a
 * reader who has read one already knows which way an is-a points. They are
 * defined once for the document rather than once per edge, which is the point
 * of an SVG marker.
 */
export function BoardMarkers(): React.JSX.Element {
  return (
    <svg className="pointer-events-none absolute size-0" aria-hidden>
      <defs>
        {KINDS.flatMap(kind => PAINTS.map(([paint, colour]) => (
          <marker
            key={`${kind}-${paint}`}
            id={`board-${kind}-${paint}`}
            viewBox="0 0 12 12"
            // Every end stands just outside the border it points at. Centred
            // on it instead, the dot was cut in half by the card drawn over it.
            refX={kind === 'dot' ? 9 : 11}
            refY={6}
            markerWidth={13}
            markerHeight={13}
            orient="auto-start-reverse"
            markerUnits="userSpaceOnUse"
          >
            {shapeOf(kind, colour)}
          </marker>
        )))}
      </defs>
    </svg>
  )
}

function shapeOf(kind: Exclude<MarkerKind, 'none'>, colour: string): React.JSX.Element {
  switch (kind) {
    case 'triangleHollow':
      return <path d="M1 1 L11 6 L1 11 z" fill="var(--surface)" stroke={colour} strokeWidth={1.4} />
    case 'diamond':
      return <path d="M0 6 L6 1.5 L12 6 L6 10.5 z" fill={colour} stroke={colour} strokeWidth={1} strokeLinejoin="round" />
    // Filled, and closed. Drawn as two strokes meeting at a point it read as a
    // scratch beside the line rather than as the end of it.
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
