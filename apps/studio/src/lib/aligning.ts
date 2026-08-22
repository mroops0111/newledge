export interface Point {
  readonly x: number
  readonly y: number
}

export interface Box extends Point {
  readonly width: number
  readonly height: number
}

/** A line shown while dragging, saying what the thing being moved lined up with. */
export interface Guide {
  readonly axis: 'x' | 'y'
  /** Where the line sits on its own axis. */
  readonly at: number
  /** How far it runs along the other axis, which is what it reaches between. */
  readonly from: number
  readonly to: number
  /**
   * What the line is saying.
   * An edge two things share, or a gap that now matches another gap.
   */
  readonly kind: 'edge' | 'gap'
}

export interface Alignment {
  readonly at: Point
  readonly guides: readonly Guide[]
}

/**
 * How near an edge has to come, in screen pixels, before it is taken to mean
 * the same line. A reader judges nearness by what they can see, so this is
 * divided by the zoom to reach board units. Measured in board units it would
 * demand pixel precision on a board zoomed out and snap wildly on one zoomed
 * in.
 */
export const TOLERANCE = 8

/**
 * Pull what is being dragged onto a line something else already sits on.
 * Edges and middles both count, since lining two cards up by their middles is
 * as deliberate a thing to do as lining them up by their left sides. A grid
 * cannot do this, because what a reader wants to line up with is wherever the
 * other card happens to be rather than a multiple of anything.
 */
export function align(moving: Box, others: readonly Box[], tolerance = TOLERANCE): Alignment {
  const across = nearest(spans(moving, 'x'), others, 'x', tolerance)
    ?? rhythm(moving, others, 'x', tolerance)
  const down = nearest(spans(moving, 'y'), others, 'y', tolerance)
    ?? rhythm(moving, others, 'y', tolerance)

  const at = {
    x: moving.x + (across?.shift ?? 0),
    y: moving.y + (down?.shift ?? 0),
  }
  const settled = { ...moving, ...at }

  return {
    at,
    guides: [
      ...(across === undefined ? [] : [guide(settled, across.other, 'x', across.line, across.kind)]),
      ...(down === undefined ? [] : [guide(settled, down.other, 'y', down.line, down.kind)]),
    ],
  }
}

/**
 * Continue a rhythm two other things have already set.
 * Two cards a gap apart propose a third at the same gap beyond either of them.
 * Even spacing is something a reader arranges for deliberately, and no edge or
 * middle can express it, so it has to be offered on its own.
 */
function rhythm(moving: Box, others: readonly Box[], axis: 'x' | 'y', tolerance: number): Match | undefined {
  const length = axis === 'x' ? moving.width : moving.height
  const start = axis === 'x' ? moving.x : moving.y
  const ends = (box: Box): [number, number] => (axis === 'x'
    ? [box.x, box.x + box.width]
    : [box.y, box.y + box.height])

  let best: Match | undefined
  let closest = tolerance
  for (const one of others) {
    for (const other of others) {
      const [, oneEnd] = ends(one)
      const [otherStart] = ends(other)
      const gap = otherStart - oneEnd
      if (one === other || gap <= 0)
        continue
      const [, otherEnd] = ends(other)
      for (const proposed of [otherEnd + gap, ends(one)[0] - gap - length]) {
        if (Math.abs(proposed - start) >= closest)
          continue
        closest = Math.abs(proposed - start)
        best = { shift: proposed - start, line: proposed, other, kind: 'gap' }
      }
    }
  }
  return best
}

/** The three lines a box offers on one axis, being its two edges and its middle. */
function spans(box: Box, axis: 'x' | 'y'): number[] {
  const start = axis === 'x' ? box.x : box.y
  const length = axis === 'x' ? box.width : box.height
  return [start, start + length / 2, start + length]
}

interface Match {
  readonly shift: number
  readonly line: number
  readonly other: Box
  readonly kind: 'edge' | 'gap'
}

/**
 * The closest line worth snapping to, or nothing when none is close enough.
 * Ties go to the first candidate, so a drag between two equally near lines
 * settles rather than flickering between them.
 */
function nearest(mine: readonly number[], others: readonly Box[], axis: 'x' | 'y', tolerance: number): Match | undefined {
  let best: Match | undefined
  let closest = tolerance
  for (const other of others) {
    for (const theirs of spans(other, axis)) {
      for (const ours of mine) {
        const gap = Math.abs(theirs - ours)
        if (gap >= closest)
          continue
        closest = gap
        best = { shift: theirs - ours, line: theirs, other, kind: 'edge' }
      }
    }
  }
  return best
}

function guide(moving: Box, other: Box, axis: 'x' | 'y', at: number, kind: 'edge' | 'gap'): Guide {
  const [one, two] = axis === 'x'
    ? [[moving.y, moving.y + moving.height], [other.y, other.y + other.height]]
    : [[moving.x, moving.x + moving.width], [other.x, other.x + other.width]]
  return {
    axis,
    at,
    from: Math.min(one![0]!, two![0]!),
    to: Math.max(one![1]!, two![1]!),
    kind,
  }
}
