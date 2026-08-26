import type { Card, Section } from '@newledge/board'
import { sectionHolding } from '@newledge/board'
import type { Box, LayoutEdge, LayoutNode, Point } from '@newledge/board-layout'
import { boxHolds, settledByPull } from '@newledge/board-layout'
import { SECTION_GAP } from './grid.js'

/** How much of a section is left showing past whatever stands on it. */
const HOLDS_ITS_OWN = 24

/**
 * The sections, each drawn big enough to hold what stands on it.
 * A section is sized by the layout from what a card was estimated to need,
 * and a card turns out taller than the estimate,
 * once the browser has laid its words out,
 * so ground meant to hold one ends a few pixels short of it.
 * Ground that does not reach the edge of what stands on it reads as a mistake,
 * wherever it happens.
 *
 * Only ever grown.
 * A reader who drags a card off has not asked the ground to close behind them,
 * and one that did would move the cards still on it.
 */
export function grownSections(sections: readonly Section[], standing: Iterable<Box>): Section[] {
  const boxes = [...standing]
  return sections.map((section) => {
    const held = boxes.filter(box => sectionHolding(box, [section]) !== undefined)
    if (held.length === 0)
      return section
    const right = Math.max(...held.map(box => box.x + box.width + HOLDS_ITS_OWN))
    const bottom = Math.max(...held.map(box => box.y + box.height + HOLDS_ITS_OWN))
    return {
      ...section,
      width: Math.max(section.width, right - section.x),
      height: Math.max(section.height, bottom - section.y),
    }
  })
}

/**
 * How far apart two sections' tops may be and still be read as one row.
 * A packing lines a row up on its tallest member,
 * so the rest of the row can sit a little below without having left it.
 */
const SAME_ROW = 40

/**
 * Move whole sections along their rows so what relates sits nearer.
 *
 * A packing places a section by how well it fills a space,
 * which says nothing about what the section is about.
 * Two sections that talk to each other can end up at opposite ends of it,
 * and a relation that far apart is too long to be worth drawing,
 * so the board loses it. Where a section sits in its row is free,
 * in exactly the way the order of siblings in a family is free,
 * so it is spent the same way.
 *
 * A card goes wherever the section holding it went,
 * since a section is ground and moving it is moving everything standing on it.
 */
export function shuffledSections(
  sections: readonly Section[],
  cards: readonly Card[],
  edges: readonly LayoutEdge[],
  sectionOf: (nodeId: string) => string | undefined,
): { sections: Section[], cards: Card[] } {
  const between: LayoutEdge[] = edges.flatMap((edge) => {
    const from = sectionOf(edge.from)
    const to = sectionOf(edge.to)
    return from === undefined || to === undefined || from === to
      ? []
      : [{ ...edge, from, to }]
  })
  if (between.length === 0)
    return { sections: [...sections], cards: [...cards] }

  const was = new Map(sections.map(section => [section.id, section]))
  const now = settledByPull(inRows(sections), between, was)
  const moved = new Map([...now]
    .map(([id, box]) => [id, box.x - was.get(id)!.x] as const)
    .filter(([, by]) => by !== 0))

  return {
    sections: sections.map(section => ({ ...section, x: now.get(section.id)?.x ?? section.x })),
    cards: cards.map((card) => {
      const by = moved.get(sectionOf(card.nodeId) ?? '')
      return by === undefined ? card : { ...card, x: card.x + by }
    }),
  }
}

/**
 * Which ground each card stands on, whatever it was filed under.
 * Filing says where a card belongs, and a layout mostly puts it there,
 * but a card the ontology filed nowhere is placed all the same,
 * and a card can be moved.
 * What matters to a ground about to move is what is standing on it.
 */
export function groundsUnder(
  cards: readonly Card[],
  extents: ReadonlyMap<string, LayoutNode>,
  sections: readonly Section[],
): (nodeId: string) => string | undefined {
  const standing = new Map(cards.flatMap((card) => {
    const size = extents.get(card.nodeId)
    if (size === undefined)
      return []
    const box = { x: card.x, y: card.y, width: size.width, height: size.height }
    const ground = sections.find(section => boxHolds(section, box))
    return ground === undefined ? [] : [[card.nodeId, ground.id] as const]
  }))
  return nodeId => standing.get(nodeId)
}

/**
 * The cards standing on no ground at all.
 * A card is filed under a topic or it is not,
 * and one that is not is drawn out in the open. It moves with no section,
 * so every section has to reckon with where it stands,
 * or a ground slides through it.
 */
export function looseBoxes(
  cards: readonly Card[],
  extents: ReadonlyMap<string, LayoutNode>,
  standingOn: (nodeId: string) => string | undefined,
): Box[] {
  return cards.flatMap((card) => {
    const size = extents.get(card.nodeId)
    return size === undefined || standingOn(card.nodeId) !== undefined
      ? []
      : [{ x: card.x, y: card.y, width: size.width, height: size.height }]
  })
}

/**
 * Pull every section up until it stands one gap under whatever is above it.
 *
 * A layout lays its rows out on their tops,
 * so a row holding one short section and one tall one,
 * leaves a hole under the short one as deep as the difference.
 * Nothing stands in that hole and no relation crosses it,
 * it is only where the row happened to end.
 *
 * Only upwards, and only past sections it does not stand under,
 * so what was left of something stays left of it and the reading order holds.
 * A section that meets nothing above it comes to the top of the board,
 * which is what puts a short section beside a tall one instead of over it.
 *
 * A card goes wherever the section holding it went,
 * since a section is ground and moving it is moving everything standing on it.
 */
export function closedUp(
  sections: readonly Section[],
  cards: readonly Card[],
  sectionOf: (nodeId: string) => string | undefined,
  loose: readonly Box[],
): { sections: Section[], cards: Card[] } {
  const top = Math.min(...sections.map(section => section.y))
  const risen: Section[] = []
  const moved = new Map<string, number>()

  for (const section of [...sections].sort((one, other) => one.y - other.y || one.x - other.x)) {
    const alongside = (box: Box): boolean =>
      box.x < section.x + section.width && box.x + box.width > section.x
    const over = [
      ...risen.filter(alongside),
      // A card nobody filed stands on no ground and so moves with none.
      // Left out of the reckoning, a ground rises through one,
      // and the card ends up half on it and half off,
      // which reads worse than the hole.
      ...loose.filter(box => alongside(box) && box.y + box.height <= section.y),
    ]
    const under = over.length === 0
      ? top
      : Math.max(...over.map(other => other.y + other.height)) + SECTION_GAP
    risen.push({ ...section, y: under })
    if (under !== section.y)
      moved.set(section.id, under - section.y)
  }

  return {
    sections: risen,
    cards: cards.map((card) => {
      const by = moved.get(sectionOf(card.nodeId) ?? '')
      return by === undefined ? card : { ...card, y: card.y + by }
    }),
  }
}

/**
 * How many times the grounds are gone over before the sweep gives up.
 * Moving one ground moves what every other ground is reaching for,
 * so a single pass leaves each of them answering a question,
 * that has since changed,
 * and the board it lands on depends on the order they were taken in.
 * Gone over until none of them wants to move, they settle instead.
 * Every move shortens the total, so the run has to end,
 * and the count is only a backstop.
 */
const SWEEPS = 8

/**
 * Slide each section until it stands level with what it relates to.
 *
 * A section is placed by how the grounds pack,
 * which says nothing about what is written on them.
 * A ground whose cards all speak to cards on the ground below,
 * can end up at the far corner of the board,
 * and every one of those relations then reaches the whole way across,
 * turning as it goes.
 *
 * Where a section sits along the axis it has room on is free,
 * in the way the order of siblings in a family is free,
 * and it is spent the same way.
 * A section is offered every position that would put one of its cards,
 * level with the card that card speaks to,
 * and takes whichever of those leaves its relations shortest.
 *
 * It is stopped by whatever it would run into, one gap short,
 * so what was above something stays above it and no ground lands on another.
 * A card goes wherever the section holding it went.
 *
 * The grounds are gone over until none of them wants to move,
 * since moving one moves what the others are reaching for.
 */
export function broughtNear(
  sections: readonly Section[],
  cards: readonly Card[],
  extents: ReadonlyMap<string, LayoutNode>,
  edges: readonly LayoutEdge[],
  sectionOf: (nodeId: string) => string | undefined,
  loose: readonly Box[],
): { sections: Section[], cards: Card[] } {
  const at = new Map(sections.map(section => [section.id, { ...section }]))
  const moved = new Map(cards.map(card => [card.nodeId, { ...card }]))
  const middleOf = (nodeId: string): Point | undefined => {
    const card = moved.get(nodeId)
    const size = extents.get(nodeId)
    return card === undefined || size === undefined
      ? undefined
      : { x: card.x + size.width / 2, y: card.y + size.height / 2 }
  }

  const named = [...at.values()].sort((one, other) => one.id.localeCompare(other.id))
  for (let sweep = 0; sweep < SWEEPS; sweep += 1) {
    let settled = true
    for (const section of named) {
      const reaching = edges.flatMap((edge) => {
        const ends = [[edge.from, edge.to], [edge.to, edge.from]] as const
        return ends.flatMap(([mine, theirs]) => {
          if (sectionOf(mine) !== section.id || sectionOf(theirs) === section.id)
            return []
          const [here, there] = [middleOf(mine), middleOf(theirs)]
          return here === undefined || there === undefined ? [] : [{ here, there }]
        })
      })
      if (reaching.length === 0)
        continue

      for (const axis of ['y', 'x'] as const) {
        const room = roomToMove(at.get(section.id)!, [...at.values(), ...loose], axis)
        const asked = [0, ...reaching.map(one => one.there[axis] - one.here[axis])]
        let bestShift = 0
        let shortest = Number.POSITIVE_INFINITY
        for (const shift of asked) {
          const held = Math.min(Math.max(shift, room.least), room.most)
          const reach = reaching.reduce((sum, one) =>
            sum + Math.abs(one.here[axis] + held - one.there[axis]), 0)
          if (reach < shortest) {
            shortest = reach
            bestShift = held
          }
        }
        if (bestShift === 0)
          continue

        settled = false
        const standing = at.get(section.id)!
        at.set(section.id, { ...standing, [axis]: standing[axis] + bestShift })
        for (const card of moved.values()) {
          if (sectionOf(card.nodeId) === section.id)
            card[axis] += bestShift
        }
      }
    }
    if (settled)
      break
  }

  return { sections: [...at.values()], cards: [...moved.values()] }
}

/**
 * How far a section may slide along one axis before it meets another.
 * Only sections it would actually run into count,
 * which are the ones it already shares ground with across the other axis.
 */
function roomToMove(
  section: Section,
  standing: readonly Box[],
  axis: 'x' | 'y',
): { least: number, most: number } {
  const across = axis === 'x' ? 'y' : 'x'
  const lengthOf = (one: Box, way: 'x' | 'y'): number => (way === 'x' ? one.width : one.height)
  const span = lengthOf(section, axis)

  let least = Number.NEGATIVE_INFINITY
  let most = Number.POSITIVE_INFINITY
  for (const other of standing) {
    if (other === section)
      continue
    const clear = other[across] + lengthOf(other, across) <= section[across]
      || section[across] + lengthOf(section, across) <= other[across]
    if (clear)
      continue
    const otherEnd = other[axis] + lengthOf(other, axis)
    if (otherEnd <= section[axis])
      least = Math.max(least, otherEnd + SECTION_GAP - section[axis])
    else if (other[axis] >= section[axis] + span)
      most = Math.min(most, other[axis] - SECTION_GAP - (section[axis] + span))
  }
  return { least, most }
}

/** The rows a packing left the sections in, each read from left to right. */
function inRows(sections: readonly Section[]): string[][] {
  const rows: Section[][] = []
  for (const section of [...sections].sort((one, other) => one.y - other.y)) {
    const row = rows[rows.length - 1]
    if (row === undefined || section.y - row[0]!.y > SAME_ROW)
      rows.push([section])
    else row.push(section)
  }
  return rows.map(row => row
    .sort((one, other) => one.x - other.x)
    .map(section => section.id))
}
