import type { Board, BoardState } from '@newledge/board'

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

/** Replace one board within the state, leaving the others as they were. */
export function withBoard(state: BoardState, board: Board): BoardState {
  const known = state.boards.some(candidate => candidate.id === board.id)
  return {
    boards: known
      ? state.boards.map(candidate => (candidate.id === board.id ? board : candidate))
      : [...state.boards, board],
  }
}

const ARRIVAL = { x: 80, y: 120 }
const SECTION_EXTENT = { width: 420, height: 300 }
const NEW_SECTION_NAME = 'New section'
const CARD_EXTENT = { width: 240, height: 120 }
const CLEAR_OF_EVERYTHING = 60

/**
 * Where something new can land without covering what is already arranged.
 * A reader put the rest of the board where they meant it to be, so an arrival
 * goes to the side rather than on top of any of it.
 */
function clearOfEverything(board: Board): number {
  const rightEdges = [
    ...board.cards.map(card => card.x + CARD_EXTENT.width),
    ...board.sections.map(section => section.x + section.width),
  ]
  return Math.max(ARRIVAL.x, ...rightEdges.map(edge => edge + CLEAR_OF_EVERYTHING))
}

/**
 * Put something a reader chose onto the board.
 * Each arrival widens the board, so the next one lands beside it rather than
 * on top of it, and a reader can see what they just added.
 */
export function withCard(board: Board, nodeId: string): Board {
  if (board.cards.some(card => card.nodeId === nodeId))
    return board
  return {
    ...board,
    cards: [...board.cards, { nodeId, x: clearOfEverything(board), y: ARRIVAL.y }],
  }
}

/**
 * Draw a section, named later by whoever drew it.
 * It lands clear of everything already on the board, so a section starts empty
 * and only holds what a reader drags into it.
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
