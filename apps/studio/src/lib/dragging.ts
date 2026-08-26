import type { Section } from '@newledge/board'
import { sectionHolding } from '@newledge/board'
import type { Box, Extent, Point } from '@newledge/board-layout'
import type { Guide } from './aligning.js'
import { align } from './aligning.js'

/** A section under the pointer, and what stood on it when it was taken. */
export interface SectionDrag {
  readonly id: string
  readonly held: ReadonlySet<string>
  /** Where the section was left by the previous frame of this drag. */
  readonly at: Point
}

/** Where a drag lands, what it takes with it, and what it lined up with. */
export interface Landing {
  readonly at: Point
  readonly carried: readonly { readonly id: string, readonly at: Point }[]
  readonly guides: readonly Guide[]
}

/**
 * Where a thing being dragged actually ends up.
 *
 * The pointer says roughly where, what is already on the board says exactly.
 * Edges and middles that nearly line up are taken to mean the same line,
 * since a reader judges by what they can see rather than by the numbers.
 *
 * A section is the shape of a thought, so moving one moves the thought.
 * What stands on it is carried by the same shift rather than laid out again,
 * which is what keeps the arrangement inside a section its reader's own.
 */
export function landing(
  moving: { readonly id: string, readonly at: Point, readonly extent: Extent },
  boxes: ReadonlyMap<string, Box>,
  sections: readonly (Box & { readonly id: string })[],
  section: SectionDrag | undefined,
  tolerance: number,
): Landing {
  const others = [
    ...[...boxes].filter(([id]) => id !== moving.id).map(([, box]) => box),
    ...sections.filter(one => one.id !== moving.id),
  ]
  const lined = align({ ...moving.extent, ...moving.at }, others, tolerance)
  if (section === undefined || section.id !== moving.id)
    return { at: lined.at, carried: [], guides: lined.guides }

  const shift = { x: lined.at.x - section.at.x, y: lined.at.y - section.at.y }
  const carried = [...section.held].flatMap((heldId) => {
    const box = boxes.get(heldId)
    return box === undefined ? [] : [{ id: heldId, at: { x: box.x + shift.x, y: box.y + shift.y } }]
  })
  return { at: lined.at, carried, guides: lined.guides }
}

/**
 * What is standing on a section,
 * read from where things are rather than from what they were filed under.
 * Settled once, when a reader takes hold of the section,
 * so a card the section slides out from under is not abandoned mid gesture.
 */
export function standingOn(
  section: Section,
  boxes: ReadonlyMap<string, Box>,
): Set<string> {
  return new Set([...boxes]
    .filter(([, box]) => sectionHolding(box, [section]) !== undefined)
    .map(([id]) => id))
}
