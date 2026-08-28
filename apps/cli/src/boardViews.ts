import type { SkillId, WorkspaceId } from '@braidhq/schema'
import { ValidationError } from '@braidhq/core'
import type { AppDependencies } from '@braidhq/server'
import type { OpenAPIHono } from '@hono/zod-openapi'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { SkillId as SkillIdSchema, ViewKind, WorkspaceId as WorkspaceIdSchema } from '@braidhq/schema'
import { VIEW_KIND } from '@newledge/view-learning'
import { z } from 'zod'

/**
 * The forms a board can be written in, which are the skills the plugin ships.
 * Named here as well because a route has to refuse a form,
 * before it reaches the runner,
 * whose own refusal would arrive as a failure rather than as an answer.
 */
const FORMS = ['reference', 'tutorial', 'exam'] as const

const Asked = z.object({ form: z.enum(FORMS) })

/**
 * Project a board into the material a view is written from.
 *
 * The half that is a function, and the half a test can reach without an agent
 * installed, which is why it is named rather than folded into the route.
 *
 * braid declares a view generator and never calls one,
 * so this is what calls it. The plugin projects the board into material,
 * which is a function and comes out the same every time,
 * and a skill then writes the page from it.
 *
 * Both halves are here rather than in the skill,
 * because a skill is a subprocess and cannot call a plugin.
 * Something has to stand between them, and this is it.
 */
export async function projectBoard(
  deps: AppDependencies,
  workspaceId: WorkspaceId,
  boardId: string,
): Promise<string> {
  const workspace = await deps.workspaceService.findById(workspaceId)
  const generator = deps.pluginRegistry.requireViewGenerator(ViewKind.parse(VIEW_KIND))
  const model = await deps.modelService.getSnapshot(workspaceId)
  const artifact = await generator.render({ model, config: { workspaceId, boardId } })

  const written = await Promise.all(artifact.files.map(async (file) => {
    const path = join(workspace.rootPath, 'artifacts', file.path)
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, file.text, 'utf-8')
    // The skill is handed a path it can resolve against the workspace root,
    // which is the one directory it is told about.
    return join('artifacts', file.path)
  }))

  const [first] = written
  if (first === undefined)
    throw new Error(`Nothing was projected out of board "${boardId}"`)
  return first
}

/** The skill that writes this form, under the namespace the plugin declares. */
function skillFor(form: string): SkillId {
  return SkillIdSchema.parse(`${VIEW_KIND}:${form}`)
}

/**
 * Mount the route a reader asks for a view through.
 *
 * A view of a board is created rather than commanded,
 * so it is a POST to the board's own views. Writing takes a minute or so,
 * so the run is handed back for the caller to watch rather than waited on.
 */
export function mountBoardViews(app: OpenAPIHono, deps: AppDependencies): void {
  app.post('/workspaces/:workspaceId/boards/:boardId/views', async (context) => {
    const workspaceId = WorkspaceIdSchema.parse(context.req.param('workspaceId'))
    const boardId = context.req.param('boardId') ?? ''
    const asked = Asked.safeParse(await context.req.json())
    if (!asked.success)
      throw new ValidationError(`A view is written in one of ${FORMS.join(', ')}`)
    const { form } = asked.data

    const runner = deps.skillRunner
    if (runner === undefined)
      return context.json({ title: 'ConflictError', detail: 'No agent is configured to write a view' }, 409)

    const material = await projectBoard(deps, workspaceId, boardId)
    const workspace = await deps.workspaceService.findById(workspaceId)
    const runId = await runner.start(workspace, skillFor(form), material)

    return context.json({ runId, form, material }, 202)
  })
}
