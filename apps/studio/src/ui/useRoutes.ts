import type { Box, Point, Routing } from '@newledge/board-layout'
import { useEffect, useMemo, useState } from 'react'
import type { GraphEdge } from '../lib/graph.js'

const NO_ROUTES: ReadonlyMap<string, readonly Point[]> = new Map()

/**
 * Where each line runs, worked out from where the cards are now.
 *
 * It cannot be kept from the arrangement,
 * because a reader moving one card makes every route that went round it wrong.
 * It cannot be asked of the placement again either,
 * because that would move the cards a reader put where they wanted them.
 * So it is its own answer, asked again whenever a card settles somewhere new.
 *
 * The answer arrives late,
 * since routing is asked of something outside the frame,
 * and a reader can move another card while it is still thinking.
 * The one in flight is dropped rather than landed on a board that moved on.
 */
export function useRoutes({ routing, boxes, grounds, edges, trunks }: {
  routing: Routing
  boxes: ReadonlyMap<string, Box>
  grounds: readonly (Box & { id: string })[]
  edges: readonly GraphEdge[]
  /** The runs a hierarchy drew itself, which are not routed and not moved. */
  trunks: ReadonlyMap<string, readonly Point[]>
}): ReadonlyMap<string, readonly Point[]> {
  const [routes, setRoutes] = useState(NO_ROUTES)

  const obstacles = useMemo(
    () => [
      ...[...boxes].map(([id, box]) => ({ id, ...box })),
      // Given as ground rather than as something to avoid,
      // since a section is drawn under every line,
      // and a line crossing one is not hidden by it.
      // A line still has to be able to end on one, which is why it is here.
      ...grounds.map(section => ({
        id: section.id,
        x: section.x,
        y: section.y,
        width: section.width,
        height: section.height,
        ground: true,
      })),
    ],
    [boxes, grounds],
  )

  useEffect(() => {
    if (obstacles.length === 0)
      return
    let asking = true
    void routing
      .route({
        obstacles,
        // Anything drawn as a trunk is worked out from where its cards are,
        // so routing it too spends a place on a border nothing draws to,
        // and push another line off the middle it wanted.
        edges: edges
          .filter(edge => !trunks.has(edge.id))
          .map(edge => ({ id: edge.id, type: edge.type, from: edge.fromNodeId, to: edge.toNodeId })),
        // Where those trunks end is as taken as anywhere the router placed one,
        // and unsaid a routed line lands on one,
        // and the two run along together as one.
        spoken: [...trunks.values()].flatMap(run =>
          (run.length === 0 ? [] : [run[0]!, run[run.length - 1]!])),
      })
      .then((routed) => {
        if (asking)
          setRoutes(routed.edges)
      })
    return () => { asking = false }
  }, [routing, obstacles, edges, trunks])

  return routes
}
