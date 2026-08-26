import { ViewportPortal } from '@xyflow/react'
import type { Guide } from '../lib/aligning.js'

const THICKNESS = 1

/**
 * The lines that appear while a reader is lining something up.
 * They are drawn in the board's own coordinates rather than the screen's, so
 * they stay on the edge they are about at any zoom, and they last only as long
 * as the drag that produced them.
 */
export function Guides({ guides }: { guides: readonly Guide[] }): React.JSX.Element {
  return (
    <ViewportPortal>
      {guides.map(guide => (
        <div
          key={`${guide.axis}-${guide.kind}-${guide.at}`}
          className={`pointer-events-none absolute ${guide.kind === 'gap' ? 'bg-guide/60' : 'bg-guide'}`}
          style={guide.axis === 'x'
            ? { left: guide.at, top: guide.from, width: THICKNESS, height: guide.to - guide.from }
            : { left: guide.from, top: guide.at, width: guide.to - guide.from, height: THICKNESS }}
        />
      ))}
    </ViewportPortal>
  )
}
