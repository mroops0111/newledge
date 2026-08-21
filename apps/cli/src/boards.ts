import type { WorkspaceId } from '@braidhq/schema'
import type { AppDependencies } from '@braidhq/server'
import type { OpenAPIHono } from '@hono/zod-openapi'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { WorkspaceId as WorkspaceIdSchema } from '@braidhq/schema'
import { BoardState, EMPTY_BOARD_STATE } from '@newledge/board'

const BOARDS_FILE = join('artifacts', 'boards.json')

/**
 * Boards live beside the knowledge they arrange, so an arrangement travels with
 * a workspace and a headless run can read one.
 * They are view state, so nothing here reaches the graph or the ontology.
 */
async function boardsPath(deps: AppDependencies, id: WorkspaceId): Promise<string> {
  const workspace = await deps.workspaceService.findById(id)
  return join(workspace.rootPath, BOARDS_FILE)
}

async function read(path: string): Promise<BoardState> {
  try {
    return BoardState.parse(JSON.parse(await readFile(path, 'utf-8')))
  }
  catch {
    // A workspace that has never been arranged has no file,
    // and one written by an older shape is replaced rather than mourned.
    return EMPTY_BOARD_STATE
  }
}

async function write(path: string, state: BoardState): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, `${JSON.stringify(state, null, 2)}\n`, 'utf-8')
}

/**
 * Mount the board routes onto the runtime's own HTTP surface.
 * braid has no place for a view, and should not, so this is Newledge's.
 * The whole document is read and written at once, since a board is small and a
 * partial update would need a merge rule that a single reader cannot benefit
 * from.
 */
export function mountBoards(app: OpenAPIHono, deps: AppDependencies): void {
  app.get('/workspaces/:workspaceId/boards', async (context) => {
    const id = WorkspaceIdSchema.parse(context.req.param('workspaceId'))
    return context.json(await read(await boardsPath(deps, id)))
  })

  app.put('/workspaces/:workspaceId/boards', async (context) => {
    const id = WorkspaceIdSchema.parse(context.req.param('workspaceId'))
    const state = BoardState.parse(await context.req.json())
    await write(await boardsPath(deps, id), state)
    return context.json(state)
  })
}
