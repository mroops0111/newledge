import { z } from 'zod'

/**
 * Where something sits on a board.
 * A board is arranged by a reader, so a coordinate is meaning rather than
 * output, and nothing recomputes one that a reader has set.
 */
export const Placement = z.object({
  x: z.number(),
  y: z.number(),
})
export type Placement = z.infer<typeof Placement>

/**
 * A node a reader chose to put on this board.
 * Only the id is kept, so the card reads from the graph and cannot drift from
 * it, and a node the graph no longer holds simply stops being drawn.
 */
export const Card = Placement.extend({
  nodeId: z.string().min(1),
})
export type Card = z.infer<typeof Card>

/**
 * A container a reader drew and named.
 * A section is not backed by anything in the graph, so a reader can group by a
 * thought the ontology has no word for, and changing the ontology cannot break
 * a board. Membership is where a card sits rather than a list kept beside it,
 * which is what makes dropping a card into a section the whole gesture.
 */
export const Section = Placement.extend({
  id: z.string().min(1),
  name: z.string(),
  width: z.number().positive(),
  height: z.number().positive(),
})
export type Section = z.infer<typeof Section>

/**
 * One arrangement of a chosen part of the graph.
 * A board holds a subset, not the whole, and a node can sit on several boards
 * without the graph knowing about any of them.
 */
export const Board = z.object({
  id: z.string().min(1),
  name: z.string(),
  cards: z.array(Card).default([]),
  sections: z.array(Section).default([]),
})
export type Board = z.infer<typeof Board>

/** Everything a workspace's boards amount to, which is view state and nothing else. */
export const BoardState = z.object({
  boards: z.array(Board).default([]),
})
export type BoardState = z.infer<typeof BoardState>

export const EMPTY_BOARD_STATE: BoardState = { boards: [] }

/** A card sits in the first section whose bounds hold it. */
export function sectionHolding(card: Placement, sections: readonly Section[]): Section | undefined {
  return sections.find(section =>
    card.x >= section.x
    && card.y >= section.y
    && card.x <= section.x + section.width
    && card.y <= section.y + section.height,
  )
}

/**
 * Move a section, taking whatever sits inside it along.
 * A section is the shape of a thought, so moving one moves the thought,
 * and the cards keep their arrangement within it rather than being relaid out.
 */
export function moveSection(board: Board, sectionId: string, to: Placement): Board {
  const section = board.sections.find(candidate => candidate.id === sectionId)
  if (section === undefined)
    return board

  const dx = to.x - section.x
  const dy = to.y - section.y
  const held = new Set(
    board.cards.filter(card => sectionHolding(card, [section]) !== undefined).map(card => card.nodeId),
  )

  return {
    ...board,
    sections: board.sections.map(candidate =>
      candidate.id === sectionId ? { ...candidate, ...to } : candidate,
    ),
    cards: board.cards.map(card =>
      held.has(card.nodeId) ? { ...card, x: card.x + dx, y: card.y + dy } : card,
    ),
  }
}
