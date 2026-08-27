import type { Box, Point } from '@newledge/board-layout'
import type { Edge } from '@xyflow/react'
import type { CSSProperties } from 'react'
import type { Attention } from '../lib/attention.js'
import { DIMMED, emphasisOf } from '../lib/attention.js'
import type { DrawnEdge } from '../lib/drawing.js'
import { lineColour, NO_FAMILY } from '../lib/kinship.js'
import type { Facing } from '../lib/path.js'
import { borderRun, facing } from '../lib/path.js'
import { markEnds } from './BoardMarkers.js'

export interface EdgeSurroundings {
  /** Where each card sits, and how big it turned out once drawn. */
  readonly boxes: ReadonlyMap<string, Box>
  /** The grounds a relation may end on, since a topic is drawn as a section. */
  readonly grounds: readonly (Box & { id: string })[]
  /** The routes a hierarchy draws itself, from where its cards are now. */
  readonly trunks: ReadonlyMap<string, readonly Point[]>
  /** The routes worked out to go round whatever stands in between. */
  readonly routes: ReadonlyMap<string, readonly Point[]>
  /** Which family each root leads, which is what colours the lines under it. */
  readonly familyLed: ReadonlyMap<string, string>
  readonly nearby: ReadonlySet<string>
  readonly attention: Attention
}

/**
 * The relations as the canvas is given them. A relation carries its own tone,
 * width, and head from what kind it is,
 * and its route from wherever the board managed to work one out.
 * What is left here is joining the two,
 * which is presentation and belongs nowhere near either.
 */
export function boardEdges(lines: readonly DrawnEdge[], around: EdgeSurroundings): Edge[] {
  return lines.flatMap((line) => {
    const emphasis = emphasisOf(line.id, around.nearby, around.attention)
    if (emphasis === 'gone')
      return []

    const points = pointsFor(line, around)
    const paint = paintOf(line, around.familyLed)
    return [{
      id: line.id,
      source: line.source,
      target: line.target,
      type: 'line',
      ...(line.label === undefined ? {} : { label: line.label }),
      data: {
        ...(points === undefined ? {} : { points }),
        curved: line.style.kin === 'curve',
        ...sidesOf(line, points, around),
      },
      style: {
        stroke: lineColour(paint),
        strokeWidth: line.style.strokeWidth,
        ...(line.style.dash === undefined ? {} : { strokeDasharray: line.style.dash }),
        ...(emphasis === 'dimmed' ? { opacity: DIMMED } : {}),
      },
      ...markEnds(line.style, paint, { from: line.source, to: line.target }, drawnTowards(line, around)),
      // Above the ground a section paints, below the cards it holds.
      zIndex: 2,
    }]
  })
}

/**
 * A line's weight held against the board's scale rather than left to it.
 *
 * A stroke narrower than a pixel is not drawn narrow, it is drawn pale,
 * since there is nothing left for the screen to do with it but spread it.
 * A board zoomed to hold all of itself does that to every line on it,
 * and a board of pale grey says nothing about what is joined to what.
 *
 * The dashes go with it. A pattern in board units closes as the board shrinks,
 * so a line that reads as broken up close reads as solid from far off,
 * which is the one thing the dashes are there to say.
 */
export function heldAt(
  style: CSSProperties | undefined,
  growth: number,
): CSSProperties {
  const dash = style?.strokeDasharray
  return {
    ...style,
    strokeWidth: Number(style?.strokeWidth ?? 1) * growth,
    ...(typeof dash !== 'string'
      ? {}
      : { strokeDasharray: dash.split(' ').map(step => Number(step) * growth).join(' ') }),
  }
}

/**
 * The route a line takes. A hierarchy is drawn from where its cards are now,
 * so it survives a reader moving one.
 * Everything else follows the route that was worked out,
 * to go round the cards in between,
 * and falls back to running border to border when there is no route for it.
 */
function pointsFor(line: DrawnEdge, around: EdgeSurroundings): readonly Point[] | undefined {
  const routed = around.trunks.get(line.id) ?? around.routes.get(line.id)
  if (routed !== undefined)
    return routed
  const [from, to] = [extentOfEnd(line.source, around), extentOfEnd(line.target, around)]
  return from === undefined || to === undefined ? undefined : borderRun(from, to)
}

/**
 * Which way the line runs as it leaves each of its two cards.
 * Taken from the border each end sits on,
 * so a curve leaves square on to that border,
 * instead of at whatever angle the two centres happen to make.
 */
function sidesOf(
  line: DrawnEdge,
  points: readonly Point[] | undefined,
  around: EdgeSurroundings,
): { leaves?: Facing, arrives?: Facing } {
  if (points === undefined || points.length < 2)
    return {}
  const from = extentOfEnd(line.source, around)
  const to = extentOfEnd(line.target, around)
  return {
    ...(from === undefined ? {} : { leaves: facing(from, points[0]!) }),
    ...(to === undefined ? {} : { arrives: facing(to, points[points.length - 1]!) }),
  }
}

/** How big whichever end this is, whether it is a card or the ground itself. */
function extentOfEnd(id: string, around: EdgeSurroundings): Box | undefined {
  return around.boxes.get(id) ?? around.grounds.find(ground => ground.id === id)
}

/** Which of a relation's two ends its kind stands several of itself at. */
function rootOf(line: DrawnEdge): string | undefined {
  return line.style.rootAt === 'from'
    ? line.source
    : line.style.rootAt === 'to' ? line.target : undefined
}

/**
 * Which card the line is drawn towards,
 * which is what decides where its mark stands.
 * A trunk is built from each child up to the root its siblings share,
 * so a relation drawn as one arrives at its root however it is written.
 * Everything else runs the way the relation is written.
 */
function drawnTowards(line: DrawnEdge, around: EdgeSurroundings): string {
  return around.trunks.has(line.id) ? rootOf(line) ?? line.target : line.target
}

/**
 * Which family's colour a line carries.
 * A relation drawn between two grounds belongs to neither family,
 * so it keeps the tone its own kind carries.
 */
function paintOf(line: DrawnEdge, familyLed: ReadonlyMap<string, string>): string {
  if (line.style.kin !== 'tree')
    return line.style.tone
  return familyLed.get(rootOf(line) ?? line.target) ?? NO_FAMILY
}
