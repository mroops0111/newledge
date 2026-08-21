import type { EdgeTone, MarkerKind } from '../lib/boardStyle.js'
import { TONE_COLOURS } from '../lib/boardStyle.js'

const KINDS: readonly Exclude<MarkerKind, 'none'>[] = ['triangleHollow', 'diamond', 'arrow', 'dot']
const TONES = Object.keys(TONE_COLOURS) as EdgeTone[]

/** What an edge points its end at, or nothing when the relation has no direction. */
export function markerId(kind: MarkerKind, tone: EdgeTone): string | undefined {
  return kind === 'none' ? undefined : `url(#board-${kind}-${tone})`
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
        {KINDS.flatMap(kind => TONES.map(tone => (
          <marker
            key={`${kind}-${tone}`}
            id={`board-${kind}-${tone}`}
            viewBox="0 0 12 12"
            refX={kind === 'dot' ? 6 : 11}
            refY={6}
            markerWidth={9}
            markerHeight={9}
            orient="auto-start-reverse"
            markerUnits="userSpaceOnUse"
          >
            {shapeOf(kind, TONE_COLOURS[tone])}
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
      return <path d="M1 6 L6 2 L11 6 L6 10 z" fill={colour} stroke={colour} strokeWidth={1} />
    case 'arrow':
      return <path d="M2 2 L11 6 L2 10" fill="none" stroke={colour} strokeWidth={1.6} strokeLinecap="round" />
    case 'dot':
      return <circle cx={6} cy={6} r={3} fill={colour} />
    default: {
      const exhaustive: never = kind
      throw new Error(`Unhandled marker: ${JSON.stringify(exhaustive)}`)
    }
  }
}
