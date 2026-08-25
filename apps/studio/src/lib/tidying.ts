import type { Card, Section } from '@newledge/board'
import type { Box, LayoutEdge, LayoutNode } from '@newledge/board-layout'
import { boxesOverlap, boxHolds, centreOf, orderedByPull } from '@newledge/board-layout'
import { edgeStyle } from './boardStyle.js'
import { rootOf } from './brood.js'
import { onGrid } from './grid.js'

/**
 * How many times the cards of a ground are gone over before the sweep gives up.
 * Each sweep can only shorten what the last one left,
 * and the run stops early once a whole sweep changes nothing,
 * so the count is only a backstop.
 */
const SWEEPS = 6

/**
 * Swap the cards of a ground about until their relations shorten.
 *
 * A packing places a card by how well it fills a space,
 * which says nothing about what is written on it.
 * A card whose every relation runs to the ground below,
 * can be left in the row furthest from it,
 * while a card that speaks to nothing at all sits nearest.
 *
 * Which of a ground's places a card takes is free.
 * A ground says these cards belong together and nothing more,
 * so any of them may stand in any of its places,
 * and the places are spent on putting each card nearest what it reaches for.
 * Two cards are exchanged whenever the exchange shortens the reach,
 * of every relation the two of them have,
 * and the cards are gone over until none of them wants to move.
 * Every step shortens the total, so the run has to end.
 *
 * A card held in a family keeps its place.
 * A family is a whole and its parts laid out as a tree,
 * so which place a part takes is what says it is a part,
 * and exchanging one for a stranger reads as neither.
 */
export function settledInGrounds(
  cards: readonly Card[],
  extents: ReadonlyMap<string, LayoutNode>,
  edges: readonly LayoutEdge[],
  sections: readonly Section[],
  partOf: ReadonlyMap<string, string>,
): Card[] {
  const at = new Map(cards.map(card => [card.nodeId, { ...card }]))
  const boxOf = (id: string): Box | undefined => {
    const card = at.get(id)
    const size = extents.get(id)
    return card === undefined || size === undefined
      ? undefined
      : { x: card.x, y: card.y, width: size.width, height: size.height }
  }
  const reach = (): number => edges.reduce((sum, edge) => {
    const [one, other] = [boxOf(edge.from), boxOf(edge.to)]
    return one === undefined || other === undefined
      ? sum
      : sum + Math.abs(centreOf(one).x - centreOf(other).x)
        + Math.abs(centreOf(one).y - centreOf(other).y)
  }, 0)
  const swap = (one: string, other: string): void => {
    const [here, there] = [at.get(one)!, at.get(other)!]
    const was = { x: here.x, y: here.y };
    [here.x, here.y] = [there.x, there.y];
    [there.x, there.y] = [was.x, was.y]
  }

  // A family of one has no shape to keep.
  // A card is the root of one whenever anything is said about it,
  // and most of what is said about a card is never placed,
  // so counting the members that were,
  // is what tells a tree from a card that merely has a name.
  const placedInFamily = new Map<string, number>()
  for (const card of cards) {
    const family = partOf.get(card.nodeId)
    if (family !== undefined)
      placedInFamily.set(family, (placedInFamily.get(family) ?? 0) + 1)
  }
  const inFamily = (id: string): boolean => {
    const family = partOf.get(id)
    return family !== undefined && (placedInFamily.get(family) ?? 0) > 1
  }

  for (const section of sections) {
    const standing = cards
      .map(card => card.nodeId)
      .filter((id) => {
        const box = boxOf(id)
        return box !== undefined && !inFamily(id) && boxHolds(section, box)
      })
      .sort((one, other) => one.localeCompare(other))

    for (let sweep = 0; sweep < SWEEPS; sweep += 1) {
      let moved = false
      for (const [place, one] of standing.entries()) {
        for (const other of standing.slice(place + 1)) {
          const before = reach()
          swap(one, other)
          if (reach() < before)
            moved = true
          else
            swap(one, other)
        }
      }
      if (!moved)
        break
    }
  }
  return [...at.values()]
}

/**
 * How far apart two cards' left edges may be and still be read as one column.
 * An eighth of a card,
 * which is half the step between two of the places a line may meet one.
 * Further apart than that and the two are not a column a reader would see,
 * they are two cards that happen to stand near each other.
 */
const SAME_COLUMN = 1 / 8

/**
 * Put the cards a layout left in one column onto one line.
 *
 * A packing fills a space rather than ruling columns,
 * so it can set one card of a stack a little in from the rest.
 * Forty four units on the real board, which is under a tenth of a card,
 * far too little to read as a column of its own,
 * so it reads as a card that failed to line up.
 *
 * Only cards standing on the same ground, and only along the way they stack,
 * so a row is left to the layout and to the family that ordered it.
 * The leftmost of a column is the line the rest come to,
 * since moving left cannot push a card out through the right of its ground.
 */
export function columned(
  cards: readonly Card[],
  extents: ReadonlyMap<string, LayoutNode>,
  sections: readonly Section[],
): Card[] {
  const at = new Map(cards.map(card => [card.nodeId, { ...card }]))
  const widthOf = (id: string): number => extents.get(id)?.width ?? 0
  const groundOf = (card: Card): string | undefined =>
    sections.find(section => card.x >= section.x && card.y >= section.y
      && card.x <= section.x + section.width && card.y <= section.y + section.height)?.id

  const leftFirst = [...cards].sort((one, other) => one.x - other.x || one.nodeId.localeCompare(other.nodeId))
  const settled = new Set<string>()
  for (const card of leftFirst) {
    if (settled.has(card.nodeId))
      continue
    const ground = groundOf(card)
    const reach = widthOf(card.nodeId) * SAME_COLUMN
    const column = leftFirst.filter(other =>
      !settled.has(other.nodeId)
      && groundOf(other) === ground
      && Math.abs(other.x - card.x) < reach)
    for (const member of column) {
      settled.add(member.nodeId)
      at.get(member.nodeId)!.x = card.x
    }
  }
  return [...at.values()]
}

/**
 * How far a card may be brought to come level with what it relates to.
 * A card and a half, which reaches the row above or below and no further.
 * What stops a move is the card it would land on and the ground it would leave,
 * not the distance,
 * so this is only there to keep a card from being carried off its ground,
 * by one relation while another wanted it where it was.
 */
const NEARLY = 480

/**
 * Nudge two cards a relation joins into line when they nearly are already.
 *
 * A layout places a card by what its own container needed,
 * so a source sitting directly above the concept it introduced,
 * comes back a few tens of units out of line.
 * Neither the layout nor the grid puts that right,
 * and the line between them then turns twice to cross those few pixels.
 * Lined up,
 * the line is straight and the board reads as though someone had lined it up.
 *
 * Lined up by their middles, which every card being one size makes enough.
 * Two cards whose middles agree agree at every place a line may meet them,
 * on both sides, so there is nothing further to line up.
 *
 * Only a small move, only along the axis the two are not separated on,
 * and only where the card lands clear of every other card,
 * and stays on its own ground. Whichever of the two can move does,
 * and if neither can, neither moves and the line turns as it did before.
 */
export function linedUp(
  cards: readonly Card[],
  extents: ReadonlyMap<string, LayoutNode>,
  edges: readonly LayoutEdge[],
  sections: readonly Section[],
): Card[] {
  const at = new Map(cards.map(card => [card.nodeId, { ...card }]))
  const boxOf = (id: string): Box | undefined => {
    const card = at.get(id)
    const size = extents.get(id)
    return card === undefined || size === undefined
      ? undefined
      : { x: card.x, y: card.y, width: size.width, height: size.height }
  }
  const clashes = (id: string, box: Box): boolean => [...at.keys()].some((other) => {
    const theirs = other === id ? undefined : boxOf(other)
    return theirs !== undefined && boxesOverlap(box, theirs)
  })
  const strayed = (id: string, box: Box): boolean => {
    const home = sections.find(one => boxHolds(one, boxOf(id)!))
    return home !== undefined && !boxHolds(home, box)
  }

  // A hierarchy is left alone. It is drawn as a trunk,
  // whose shape says which card is the whole and which are the parts,
  // and the arrangement has already set the parts in a row under the whole.
  // Lining a whole up with one of its parts drags it down into their row,
  // and the tree stops reading as one.
  const between = edges.filter(edge => edgeStyle(edge.type).kin !== 'tree')

  for (const edge of [...between].sort((one, other) => one.id.localeCompare(other.id))) {
    const [one, other] = [boxOf(edge.from), boxOf(edge.to)]
    if (one === undefined || other === undefined)
      continue
    const upright = Math.abs(centreOf(other).y - centreOf(one).y)
      >= Math.abs(centreOf(other).x - centreOf(one).x)
    const off = upright
      ? centreOf(other).x - centreOf(one).x
      : centreOf(other).y - centreOf(one).y
    if (off === 0 || Math.abs(off) > NEARLY)
      continue

    for (const [id, box, by] of [
      [edge.from, one, off] as const,
      [edge.to, other, -off] as const,
    ]) {
      const moved = upright ? { ...box, x: box.x + by } : { ...box, y: box.y + by }
      if (clashes(id, moved) || strayed(id, moved))
        continue
      at.set(id, { ...at.get(id)!, x: moved.x, y: moved.y })
      break
    }
  }
  return [...at.values()]
}

/**
 * How far apart siblings sit, which is the same for every pair of them.
 * The step from one to the next is put on the grid here,
 * rather than left to be rounded later, since rounding each of them on its own,
 * turns one even row into gaps that differ by a rounding.
 */
const SIBLING_GAP = 56

/**
 * Even out a family after the layout has placed it.
 * A layout spaces siblings by whatever its own placement worked out,
 * so the gaps come back uneven,
 * and the parent lands wherever its edges pulled it,
 * which reads as carelessness however sound the reasoning behind it.
 * Siblings on one row are spaced alike and the parent is centred over them.
 */
export function tidied(
  cards: readonly Card[],
  partOf: ReadonlyMap<string, string>,
  extents: ReadonlyMap<string, LayoutNode>,
  edges: readonly LayoutEdge[],
): Card[] {
  const at = new Map(cards.map(card => [card.nodeId, { ...card }]))
  const boxes = new Map(cards.flatMap((card) => {
    const size = extents.get(card.nodeId)
    return size === undefined ? [] : [[card.nodeId, { ...card, width: size.width, height: size.height }] as const]
  }))

  for (const brood of new Set(partOf.values())) {
    const parentId = rootOf(brood)
    const members = [...partOf].filter(([, id]) => id === brood).map(([member]) => member)
    const children = members.filter(member => member !== parentId)

    for (const row of rows(children, at)) {
      // Which sibling is drawn leftmost says nothing about it,
      // so the order is spent on putting each nearest whatever pulls on it.
      const pulled = orderedByPull(row, edges, boxes)
      let left = onGrid(at.get(row[0]!)!.x)
      for (const childId of pulled) {
        at.get(childId)!.x = left
        left += onGrid((extents.get(childId)?.width ?? 0) + SIBLING_GAP)
      }
      const last = at.get(pulled[pulled.length - 1]!)!
      const span = { from: at.get(pulled[0]!)!.x, to: last.x + (extents.get(last.nodeId)?.width ?? 0) }
      const parent = at.get(parentId)
      if (parent !== undefined && pulled.length > 0)
        parent.x = (span.from + span.to) / 2 - (extents.get(parentId)?.width ?? 0) / 2
    }
  }
  return [...at.values()]
}

/** Siblings sharing a line, since a family too wide for one sits on several. */
function rows(children: readonly string[], at: ReadonlyMap<string, Card>): string[][] {
  const byRow = new Map<number, string[]>()
  for (const childId of children) {
    const card = at.get(childId)
    if (card === undefined)
      continue
    byRow.set(card.y, [...(byRow.get(card.y) ?? []), childId])
  }
  return [...byRow]
    .sort(([one], [other]) => one - other)
    .map(([, row]) => row.sort((one, other) => at.get(one)!.x - at.get(other)!.x))
}
