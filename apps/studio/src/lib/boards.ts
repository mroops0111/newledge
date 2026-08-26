import type { Board, BoardState } from '@newledge/board'
import { CARD_WIDTH, nodeStyle } from './boardStyle.js'
import type { GraphNode } from './graph.js'

export interface BoardClientOptions {
  readonly apiUrl: string
  readonly workspaceId: string
  readonly fetcher?: typeof fetch
}

/** Reads and keeps how a reader has arranged what they understand. */
export interface BoardClient {
  readonly read: () => Promise<BoardState>
  readonly keep: (state: BoardState) => Promise<void>
}

export function createBoardClient(options: BoardClientOptions): BoardClient {
  const fetcher = options.fetcher ?? globalThis.fetch
  const url = `${options.apiUrl.replace(/\/+$/, '')}/workspaces/${options.workspaceId}/boards`

  return {
    read: async () => {
      const response = await fetcher(url)
      if (!response.ok)
        throw new Error(`Reading your boards failed with ${response.status}`)
      return await response.json() as BoardState
    },
    keep: async (state) => {
      const response = await fetcher(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state),
      })
      if (!response.ok)
        throw new Error(`Keeping your arrangement failed with ${response.status}`)
    },
  }
}

/**
 * The boards a workspace opens on, which are readings of one graph.
 * A board is a view, and which kinds it shows is what makes one differ,
 * so they differ in nothing else.
 * One shows the terms alone and one adds where they came from.
 * Reading them side by side is how a reader finds which one their work wants.
 *
 * Which kinds the second holds is read off the graph rather than written down,
 * so an ontology that grows does not leave a board behind.
 * Left out are the grounds, since a topic is drawn as the section itself,
 * the kinds no board places,
 * and any reading that would come out the same as one already there.
 */
export function openingBoards(nodes: readonly GraphNode[]): readonly {
  readonly id: string
  readonly name: string
  readonly holds: readonly string[]
}[] {
  const kinds = [...new Set(nodes.map(node => node.type))]
    .filter(type => nodeStyle(type).placed && !nodeStyle(type).ground)
    .sort((one, other) => nodeStyle(one).band - nodeStyle(other).band || one.localeCompare(other))

  // Only the readings that actually differ.
  // A graph of one kind read three ways is the same board three times,
  // and a reading with nothing in it says nothing about the graph it reads.
  const already = new Set<string>()
  return [
    { id: 'board-terms', name: 'Terms', holds: ['Concept'] },
    { id: 'board-everything', name: 'Terms and sources', holds: kinds },
  ].flatMap((board) => {
    const holds = board.holds.filter(type => kinds.includes(type))
    const key = [...holds].sort().join('|')
    if (holds.length === 0 || already.has(key))
      return []
    already.add(key)
    return [{ ...board, holds }]
  })
}

/**
 * A board a reader asked for, named so they can rename it.
 * It says nothing about which kinds it holds,
 * so it opens on whatever the drawing rules find worth placing,
 * which is the widest reading of the graph and the easiest one to cut down.
 *
 * The id is the first one nothing has taken,
 * so a board added after another was dropped never lands on its name.
 */
export function newBoard(state: BoardState): Board {
  const taken = new Set(state.boards.map(board => board.id))
  let count = state.boards.length + 1
  while (taken.has(`board-${count}`))
    count += 1
  return { id: `board-${count}`, name: NEW_BOARD_NAME, cards: [], sections: [] }
}

/** Replace one board within the state, leaving the others as they were. */
export function withBoard(state: BoardState, board: Board): BoardState {
  const known = state.boards.some(candidate => candidate.id === board.id)
  return {
    boards: known
      ? state.boards.map(candidate => (candidate.id === board.id ? board : candidate))
      : [...state.boards, board],
  }
}

const ARRIVAL = { x: 96, y: 120 }
/**
 * How big a section a reader drew is, which is one card with room around it.
 * A section that could not hold a single card,
 * would refuse the first thing dragged into it,
 * and a reader would have to resize before they could file.
 */
const SECTION_EXTENT = { width: 576, height: 408 }
const NEW_SECTION_NAME = 'New section'
const NEW_BOARD_NAME = 'New board'
const CLEAR_OF_EVERYTHING = 96

/**
 * Where something new can land without covering what is already arranged.
 * A reader put the rest of the board where they meant it to be,
 * so an arrival goes to the side rather than on top of any of it.
 */
function clearOfEverything(board: Board): number {
  const rightEdges = [
    ...board.cards.map(card => card.x + CARD_WIDTH),
    ...board.sections.map(section => section.x + section.width),
  ]
  return Math.max(ARRIVAL.x, ...rightEdges.map(edge => edge + CLEAR_OF_EVERYTHING))
}

/**
 * Draw a section, named later by whoever drew it.
 * It lands clear of everything already on the board,
 * so a section starts empty and only holds what a reader drags into it.
 */
export function withSection(board: Board): Board {
  const taken = new Set(board.sections.map(section => section.id))
  let ordinal = board.sections.length + 1
  while (taken.has(`section-${ordinal}`)) ordinal += 1

  return {
    ...board,
    sections: [...board.sections, {
      id: `section-${ordinal}`,
      name: NEW_SECTION_NAME,
      x: clearOfEverything(board),
      y: ARRIVAL.y,
      ...SECTION_EXTENT,
    }],
  }
}

/** Rename a section, leaving where it sits and what it holds alone. */
export function renameSection(board: Board, sectionId: string, name: string): Board {
  return {
    ...board,
    sections: board.sections.map(section => (section.id === sectionId ? { ...section, name } : section)),
  }
}
