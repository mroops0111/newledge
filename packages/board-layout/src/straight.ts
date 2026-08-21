import type { Box, Point, Routed, Routing, RoutingRequest } from './ports.js'

/**
 * A line straight from the middle of one card to the middle of another.
 * It gets around nothing, so it is only what a board falls back to when no
 * router is available, and what a test uses to say a route was asked for.
 */
export function straightRouting(): Routing {
  return {
    id: 'straight',
    route: async (request: RoutingRequest) => route(request),
  }
}

function route(request: RoutingRequest): Routed {
  const byId = new Map(request.obstacles.map(obstacle => [obstacle.id, obstacle]))
  const edges = new Map<string, readonly Point[]>()
  for (const edge of request.edges) {
    const from = byId.get(edge.from)
    const to = byId.get(edge.to)
    if (from !== undefined && to !== undefined)
      edges.set(edge.id, [centreOf(from), centreOf(to)])
  }
  return { edges }
}

function centreOf(box: Box): Point {
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}
